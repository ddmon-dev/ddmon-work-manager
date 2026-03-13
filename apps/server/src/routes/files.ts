import { Hono } from "hono";
import { and, eq, isNull, asc, desc, inArray, sql } from "drizzle-orm";
import { db } from "../db";
import { files } from "../db/schema";
import { requireAuth } from "../middleware/auth";
import { fileRenameSchema, folderCreateSchema, fileFavoriteSchema, batchDeleteSchema, batchMoveSchema, favoriteReorderSchema, fileCopySchema } from "@packages/schemas";
import { successResponse, errorResponse, ERRORS } from "../lib/errors";
import { uploadFile, deleteFile, getFile, copyStorageFile, openFileNative, STORAGE_CONFIG } from "../lib/storage";
import type { AppVariables } from "../lib/types";
import { randomUUID } from "crypto";

type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** CTE 기반 순환 참조 검증 */
async function isDescendant(tx: DbTransaction, parentId: string | null, ancestorId: string): Promise<boolean> {
  if (!parentId) return false;
  const result = await tx.execute(sql`
    WITH RECURSIVE ancestors AS (
      SELECT folder_id FROM files WHERE id = ${parentId}
      UNION ALL
      SELECT f.folder_id FROM files f JOIN ancestors a ON f.id = a.folder_id
    )
    SELECT 1 FROM ancestors WHERE folder_id = ${ancestorId} LIMIT 1
  `);
  return (result as unknown[]).length > 0;
}

/** 같은 폴더 내 이름 충돌 시 자동 넘버링 */
async function resolveUniqueName(
  executor: typeof db | DbTransaction,
  name: string,
  folderId: string | null,
  excludeId?: string
): Promise<string> {
  const existing = await (executor as typeof db)
    .select({ name: files.name })
    .from(files)
    .where(
      and(
        folderId ? eq(files.folderId, folderId) : isNull(files.folderId),
        eq(files.deleted, false),
        ...(excludeId ? [sql`${files.id} != ${excludeId}`] : [])
      )
    );

  const existingNames = new Set(existing.map((e) => e.name));
  if (!existingNames.has(name)) return name;

  const dotIdx = name.lastIndexOf(".");
  const base = dotIdx > 0 ? name.slice(0, dotIdx) : name;
  const ext = dotIdx > 0 ? name.slice(dotIdx) : "";

  let counter = 1;
  while (existingNames.has(`${base} (${counter})${ext}`)) {
    counter++;
  }
  return `${base} (${counter})${ext}`;
}

/** CTE 기반: 폴더와 하위 항목을 일괄 소프트 삭제 */
async function softDeleteRecursive(tx: DbTransaction, folderId: string, deletedAt: Date) {
  const ts = deletedAt.toISOString();
  await tx.execute(sql`
    WITH RECURSIVE descendants AS (
      SELECT id FROM files WHERE folder_id = ${folderId} AND deleted = false
      UNION ALL
      SELECT f.id FROM files f JOIN descendants d ON f.folder_id = d.id WHERE f.deleted = false
    )
    UPDATE files SET deleted = true, deleted_at = ${ts}::timestamptz, updated_at = now()
    WHERE id IN (SELECT id FROM descendants)
  `);
}

/** CTE 기반: 같은 deletedAt 타임스탬프를 가진 하위 항목을 일괄 복원 */
async function restoreRecursive(tx: DbTransaction, folderId: string, deletedAt: Date) {
  const ts = deletedAt.toISOString();
  await tx.execute(sql`
    WITH RECURSIVE descendants AS (
      SELECT id FROM files WHERE folder_id = ${folderId} AND deleted = true AND deleted_at = ${ts}::timestamptz
      UNION ALL
      SELECT f.id FROM files f JOIN descendants d ON f.folder_id = d.id WHERE f.deleted = true AND f.deleted_at = ${ts}::timestamptz
    )
    UPDATE files SET deleted = false, deleted_at = NULL, updated_at = now()
    WHERE id IN (SELECT id FROM descendants)
  `);
}

/** CTE 기반: 폴더와 하위 항목을 일괄 영구 삭제. 삭제할 s3Key 목록 반환 */
async function permanentDeleteRecursive(tx: DbTransaction, folderId: string): Promise<string[]> {
  // 1. s3_key 수집
  const rows = await tx.execute(sql`
    WITH RECURSIVE descendants AS (
      SELECT id, s3_key FROM files WHERE folder_id = ${folderId}
      UNION ALL
      SELECT f.id, f.s3_key FROM files f JOIN descendants d ON f.folder_id = d.id
    )
    SELECT s3_key FROM descendants WHERE s3_key IS NOT NULL
  `);
  const s3Keys = (rows as unknown as { s3_key: string }[]).map((r) => r.s3_key);

  // 2. 일괄 삭제 (PostgreSQL은 statement 종료 후 FK 체크 → 같은 statement 내 삭제 안전)
  await tx.execute(sql`
    WITH RECURSIVE descendants AS (
      SELECT id FROM files WHERE folder_id = ${folderId}
      UNION ALL
      SELECT f.id FROM files f JOIN descendants d ON f.folder_id = d.id
    )
    DELETE FROM files WHERE id IN (SELECT id FROM descendants)
  `);

  return s3Keys;
}

const app = new Hono<{ Variables: AppVariables }>();
app.use("*", requireAuth);

// GET / — 파일/폴더 목록 (folderId 필터, null이면 루트) / favorites=true면 즐겨찾기만
app.get("/", async (c) => {
  const favorites = c.req.query("favorites");

  if (favorites === "true") {
    const items = await db.query.files.findMany({
      where: and(eq(files.isFavorited, true), eq(files.deleted, false)),
      orderBy: [asc(files.favoriteOrder), asc(files.name)],
    });
    return successResponse(c, { items });
  }

  const folderId = c.req.query("folderId") || null;

  const items = await db.query.files.findMany({
    where: and(
      folderId ? eq(files.folderId, folderId) : isNull(files.folderId),
      eq(files.deleted, false)
    ),
    orderBy: [desc(files.isFolder), asc(files.name)],
  });

  return successResponse(c, { items });
});

// POST /upload — 파일 업로드
app.post("/upload", async (c) => {
  const user = c.get("user");
  const body = await c.req.parseBody();
  const file = body["file"];
  const folderId = (body["folderId"] as string) || null;

  if (!file || !(file instanceof File)) {
    return errorResponse(c, ERRORS.VALIDATION, 400);
  }

  // 삭제된 폴더에 업로드 방지
  if (folderId) {
    const parentFolder = await db.query.files.findFirst({
      where: and(eq(files.id, folderId), eq(files.isFolder, true), eq(files.deleted, false)),
      columns: { id: true },
    });
    if (!parentFolder) {
      return errorResponse(c, ERRORS.VALIDATION, 400, "대상 폴더가 존재하지 않거나 삭제되었습니다.");
    }
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  if (buffer.length > STORAGE_CONFIG.MAX_FILE_SIZE_MB * 1024 * 1024) {
    return errorResponse(c, ERRORS.FILE_TOO_LARGE, 400, `파일 크기가 ${STORAGE_CONFIG.MAX_FILE_SIZE_MB}MB를 초과합니다.`);
  }

  const ext = file.name.includes(".") ? file.name.split(".").pop() : "";
  const uuid = randomUUID();
  const s3Key = `files/${uuid}${ext ? `.${ext}` : ""}`;

  const uniqueName = await resolveUniqueName(db, file.name, folderId);

  await uploadFile(s3Key, buffer, file.type);

  let created;
  try {
    [created] = await db
      .insert(files)
      .values({
        name: uniqueName,
        s3Key,
        mimeType: file.type,
        size: file.size,
        folderId,
        author: user.name ?? undefined,
      })
      .returning();
  } catch (err) {
    await deleteFile(s3Key);
    throw err;
  }

  return successResponse(c, created, 201);
});

// POST /folder — 폴더 생성
app.post("/folder", async (c) => {
  const user = c.get("user");
  const parsed = folderCreateSchema.safeParse(await c.req.json());
  if (!parsed.success) return errorResponse(c, ERRORS.VALIDATION, 400);

  const targetFolderId = parsed.data.folderId ?? null;

  // 삭제된 폴더 안에 생성 방지
  if (targetFolderId) {
    const parentFolder = await db.query.files.findFirst({
      where: and(eq(files.id, targetFolderId), eq(files.isFolder, true), eq(files.deleted, false)),
      columns: { id: true },
    });
    if (!parentFolder) {
      return errorResponse(c, ERRORS.VALIDATION, 400, "대상 폴더가 존재하지 않거나 삭제되었습니다.");
    }
  }

  const uniqueName = await resolveUniqueName(db, parsed.data.name, targetFolderId);

  const [created] = await db
    .insert(files)
    .values({
      name: uniqueName,
      folderId: targetFolderId,
      isFolder: true,
      author: user.name ?? undefined,
    })
    .returning();

  return successResponse(c, created, 201);
});

// GET /:id/path — CTE 기반 폴더 조상 경로
app.get("/:id/path", async (c) => {
  const id = c.req.param("id");

  const rows = await db.execute(sql`
    WITH RECURSIVE ancestors AS (
      SELECT id, name, folder_id FROM files WHERE id = ${id} AND deleted = false
      UNION ALL
      SELECT f.id, f.name, f.folder_id FROM files f JOIN ancestors a ON f.id = a.folder_id WHERE f.deleted = false
    )
    SELECT id, name FROM ancestors
  `);

  // CTE 결과: 자신 → 부모 → 조부모 → ... → 루트 순서 → reverse로 경로 생성
  const path = (rows as unknown as { id: string; name: string }[]).reverse();

  return successResponse(c, { path });
});

// GET /:id/download — 파일 다운로드
app.get("/:id/download", async (c) => {
  const id = c.req.param("id");

  const file = await db.query.files.findFirst({
    where: and(eq(files.id, id), eq(files.deleted, false)),
  });
  if (!file || !file.s3Key) return errorResponse(c, ERRORS.NOT_FOUND, 404);

  const { stream, size } = await getFile(file.s3Key);

  return new Response(stream as any, {
    headers: {
      "Content-Type": file.mimeType ?? "application/octet-stream",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(file.name)}`,
      "Content-Length": String(file.size ?? size),
    },
  });
});

// POST /:id/open — 네이티브 앱으로 파일 열기
app.post("/:id/open", async (c) => {
  const id = c.req.param("id");

  const file = await db.query.files.findFirst({
    where: and(eq(files.id, id), eq(files.deleted, false)),
  });
  if (!file || !file.s3Key) return errorResponse(c, ERRORS.NOT_FOUND, 404);

  openFileNative(file.s3Key);

  return successResponse(c, { message: "파일을 열었습니다" });
});

// PATCH /:id/favorite — 즐겨찾기 토글
app.patch("/:id/favorite", async (c) => {
  const id = c.req.param("id");
  const parsed = fileFavoriteSchema.safeParse(await c.req.json());
  if (!parsed.success) return errorResponse(c, ERRORS.VALIDATION, 400);

  let favoriteOrder: number | null = null;
  if (parsed.data.isFavorited) {
    const maxResult = await db
      .select({ max: sql<number>`coalesce(max(${files.favoriteOrder}), 0)` })
      .from(files)
      .where(eq(files.isFavorited, true));
    favoriteOrder = (maxResult[0]?.max ?? 0) + 1;
  }

  const [updated] = await db
    .update(files)
    .set({
      isFavorited: parsed.data.isFavorited,
      favoriteOrder,
      updatedAt: new Date(),
    })
    .where(eq(files.id, id))
    .returning();

  if (!updated) return errorResponse(c, ERRORS.NOT_FOUND, 404);
  return successResponse(c, updated);
});

// PUT /favorites/reorder — 즐겨찾기 순서 변경
app.put("/favorites/reorder", async (c) => {
  const parsed = favoriteReorderSchema.safeParse(await c.req.json());
  if (!parsed.success) return errorResponse(c, ERRORS.VALIDATION, 400);

  const { ids } = parsed.data;

  await db.transaction(async (tx) => {
    for (let i = 0; i < ids.length; i++) {
      await tx
        .update(files)
        .set({ favoriteOrder: i + 1 })
        .where(eq(files.id, ids[i]));
    }
  });

  return successResponse(c, { ids });
});

// PATCH /:id — 이름 변경
app.patch("/:id", async (c) => {
  const id = c.req.param("id");
  const parsed = fileRenameSchema.safeParse(await c.req.json());
  if (!parsed.success) return errorResponse(c, ERRORS.VALIDATION, 400);

  // 이름 변경 시 중복 체크 (사용자 의도 존중 → 중복이면 400 에러)
  const target = await db.query.files.findFirst({
    where: eq(files.id, id),
    columns: { folderId: true },
  });
  if (!target) return errorResponse(c, ERRORS.NOT_FOUND, 404);

  const duplicate = await db
    .select({ id: files.id })
    .from(files)
    .where(
      and(
        target.folderId ? eq(files.folderId, target.folderId) : isNull(files.folderId),
        eq(files.name, parsed.data.name),
        eq(files.deleted, false),
        sql`${files.id} != ${id}`
      )
    )
    .limit(1);

  if (duplicate.length > 0) {
    return errorResponse(c, ERRORS.VALIDATION, 400, "같은 폴더에 동일한 이름이 이미 존재합니다.");
  }

  const [updated] = await db
    .update(files)
    .set({ name: parsed.data.name, updatedAt: new Date() })
    .where(eq(files.id, id))
    .returning();

  if (!updated) return errorResponse(c, ERRORS.NOT_FOUND, 404);
  return successResponse(c, updated);
});

// PATCH /:id/move — 폴더 이동 (트랜잭션)
app.patch("/:id/move", async (c) => {
  const id = c.req.param("id");
  const { folderId } = (await c.req.json()) as { folderId: string | null };

  if (id === folderId) {
    return errorResponse(c, ERRORS.VALIDATION, 400, "자기 자신으로 이동할 수 없습니다.");
  }

  const updated = await db.transaction(async (tx) => {
    if (folderId && (await isDescendant(tx, folderId, id))) {
      return null; // 순환 참조
    }

    // 이동 대상의 현재 이름 조회
    const target = await tx.query.files.findFirst({
      where: eq(files.id, id),
      columns: { name: true },
    });
    if (!target) return undefined;

    // 대상 폴더에서 동일 이름 중복 체크
    const duplicate = await (tx as unknown as typeof db)
      .select({ id: files.id })
      .from(files)
      .where(
        and(
          folderId ? eq(files.folderId, folderId) : isNull(files.folderId),
          eq(files.name, target.name),
          eq(files.deleted, false),
          sql`${files.id} != ${id}`
        )
      )
      .limit(1);

    if (duplicate.length > 0) return "duplicate" as const;

    const [result] = await tx
      .update(files)
      .set({ folderId, updatedAt: new Date() })
      .where(eq(files.id, id))
      .returning();

    return result;
  });

  if (updated === null) return errorResponse(c, ERRORS.CIRCULAR_REFERENCE, 400);
  if (updated === "duplicate") return errorResponse(c, ERRORS.VALIDATION, 400, "대상 폴더에 동일한 이름이 이미 존재합니다.");
  if (!updated) return errorResponse(c, ERRORS.NOT_FOUND, 404);
  return successResponse(c, updated);
});

// DELETE /:id — 휴지통으로 이동 (트랜잭션)
app.delete("/:id", async (c) => {
  const id = c.req.param("id");
  const deletedAt = new Date();

  const target = await db.query.files.findFirst({
    where: eq(files.id, id),
    columns: { id: true, isFolder: true },
  });
  if (!target) return errorResponse(c, ERRORS.NOT_FOUND, 404);

  await db.transaction(async (tx) => {
    if (target.isFolder) {
      await softDeleteRecursive(tx, id, deletedAt);
    }

    await tx
      .update(files)
      .set({ deleted: true, deletedAt, updatedAt: new Date() })
      .where(eq(files.id, id));
  });

  return successResponse(c, { id });
});

// PATCH /:id/restore — 휴지통에서 복원 (트랜잭션)
app.patch("/:id/restore", async (c) => {
  const id = c.req.param("id");

  const target = await db.query.files.findFirst({
    where: eq(files.id, id),
    columns: { id: true, isFolder: true, deletedAt: true },
  });
  if (!target) return errorResponse(c, ERRORS.NOT_FOUND, 404);

  const updated = await db.transaction(async (tx) => {
    if (target.isFolder && target.deletedAt) {
      await restoreRecursive(tx, id, target.deletedAt);
    }

    const [result] = await tx
      .update(files)
      .set({ deleted: false, deletedAt: null, updatedAt: new Date() })
      .where(eq(files.id, id))
      .returning();

    return result;
  });

  return successResponse(c, updated!);
});

// DELETE /:id/permanent — 영구 삭제 (트랜잭션 + 스토리지 후처리)
app.delete("/:id/permanent", async (c) => {
  const id = c.req.param("id");

  const file = await db.query.files.findFirst({
    where: eq(files.id, id),
  });
  if (!file) return errorResponse(c, ERRORS.NOT_FOUND, 404);

  const s3KeysToDelete: string[] = [];

  await db.transaction(async (tx) => {
    if (file.isFolder) {
      const childKeys = await permanentDeleteRecursive(tx, id);
      s3KeysToDelete.push(...childKeys);
    }

    await tx.delete(files).where(eq(files.id, id));
  });

  // 스토리지 삭제는 트랜잭션 밖에서 후처리
  if (file.s3Key) {
    s3KeysToDelete.push(file.s3Key);
  }
  await Promise.allSettled(
    s3KeysToDelete.map((key) =>
      deleteFile(key).catch((err) =>
        console.warn(`[Storage] Failed to delete file: ${key}`, err)
      )
    )
  );

  return successResponse(c, { id });
});

// POST /batch-delete — 배치 소프트 삭제 (트랜잭션)
app.post("/batch-delete", async (c) => {
  const parsed = batchDeleteSchema.safeParse(await c.req.json());
  if (!parsed.success) return errorResponse(c, ERRORS.VALIDATION, 400);

  const { ids } = parsed.data;
  const deletedAt = new Date();

  const targets = await db.query.files.findMany({
    where: and(inArray(files.id, ids), eq(files.deleted, false)),
    columns: { id: true, isFolder: true },
  });

  if (targets.length === 0) return errorResponse(c, ERRORS.NOT_FOUND, 404);

  await db.transaction(async (tx) => {
    for (const target of targets) {
      if (target.isFolder) {
        await softDeleteRecursive(tx, target.id, deletedAt);
      }
    }

    await tx
      .update(files)
      .set({ deleted: true, deletedAt, updatedAt: new Date() })
      .where(inArray(files.id, targets.map((t) => t.id)));
  });

  return successResponse(c, { ids: targets.map((t) => t.id) });
});

// POST /batch-move — 배치 이동 (트랜잭션, 충돌 시 전체 차단)
app.post("/batch-move", async (c) => {
  const parsed = batchMoveSchema.safeParse(await c.req.json());
  if (!parsed.success) return errorResponse(c, ERRORS.VALIDATION, 400);

  const { ids, folderId } = parsed.data;

  const duplicateNames: string[] = [];
  const movedIds: string[] = [];

  await db.transaction(async (tx) => {
    // 1단계: 대상 정보 조회 + 충돌 검증 (Map 캐싱)
    const targetInfoMap = new Map<string, { name: string; isFolder: boolean }>();

    for (const id of ids) {
      if (id === folderId) continue;

      const target = await tx.query.files.findFirst({
        where: eq(files.id, id),
        columns: { name: true, isFolder: true },
      });
      if (!target) continue;

      if (target.isFolder && folderId && (await isDescendant(tx, folderId, id))) {
        continue;
      }

      targetInfoMap.set(id, target);

      const duplicate = await (tx as unknown as typeof db)
        .select({ id: files.id })
        .from(files)
        .where(
          and(
            folderId ? eq(files.folderId, folderId) : isNull(files.folderId),
            eq(files.name, target.name),
            eq(files.deleted, false),
            sql`${files.id} != ${id}`
          )
        )
        .limit(1);

      if (duplicate.length > 0) {
        duplicateNames.push(target.name);
      }
    }

    // 충돌 항목이 있으면 아무것도 이동하지 않음
    if (duplicateNames.length > 0) return;

    // 2단계: 캐싱된 정보로 이동 (재조회 없음)
    for (const id of ids) {
      if (!targetInfoMap.has(id)) continue;

      await tx
        .update(files)
        .set({ folderId, updatedAt: new Date() })
        .where(eq(files.id, id));

      movedIds.push(id);
    }
  });

  if (duplicateNames.length > 0) {
    return errorResponse(c, ERRORS.VALIDATION, 400,
      `대상 폴더에 동일한 이름이 이미 존재합니다: ${duplicateNames.join(", ")}`);
  }

  return successResponse(c, { ids: movedIds });
});

// POST /copy — 다른 폴더에 복사 (배치)
app.post("/copy", async (c) => {
  const parsed = fileCopySchema.safeParse(await c.req.json());
  if (!parsed.success) return errorResponse(c, ERRORS.VALIDATION, 400);

  const { ids, folderId } = parsed.data;
  const user = c.get("user");

  const originals = await db.query.files.findMany({
    where: and(inArray(files.id, ids), eq(files.deleted, false)),
  });
  if (originals.length === 0) return errorResponse(c, ERRORS.NOT_FOUND, 404);

  const copiedS3Keys: string[] = [];

  try {
    const results = await db.transaction(async (tx) => {
      const copied = [];
      for (const original of originals) {
        const result = await copyItem(tx, original, folderId, user.name ?? null, copiedS3Keys);
        copied.push(result);
      }
      return copied;
    });

    return successResponse(c, { items: results }, 201);
  } catch (err) {
    await Promise.allSettled(copiedS3Keys.map((key) => deleteFile(key).catch(() => {})));
    throw err;
  }
});

// POST /:id/duplicate — 같은 폴더에 복제
app.post("/:id/duplicate", async (c) => {
  const id = c.req.param("id");
  const user = c.get("user");

  const original = await db.query.files.findFirst({
    where: and(eq(files.id, id), eq(files.deleted, false)),
  });
  if (!original) return errorResponse(c, ERRORS.NOT_FOUND, 404);

  const copiedS3Keys: string[] = [];

  try {
    const result = await db.transaction(async (tx) => {
      return copyItem(tx, original, original.folderId, user.name ?? null, copiedS3Keys);
    });

    return successResponse(c, result, 201);
  } catch (err) {
    // rollback 시 복사된 스토리지 파일 정리
    await Promise.allSettled(copiedS3Keys.map((key) => deleteFile(key).catch(() => {})));
    throw err;
  }
});

/** 단일 파일/폴더 복사 (재귀) */
async function copyItem(
  tx: DbTransaction,
  original: typeof files.$inferSelect,
  targetFolderId: string | null,
  author: string | null,
  copiedS3Keys: string[]
): Promise<typeof files.$inferSelect> {
  const uniqueName = await resolveUniqueName(tx as unknown as typeof db, original.name, targetFolderId);

  if (!original.isFolder) {
    // 파일 복사
    let newS3Key: string | null = null;
    if (original.s3Key) {
      const ext = original.s3Key.includes(".") ? `.${original.s3Key.split(".").pop()}` : "";
      newS3Key = `files/${randomUUID()}${ext}`;
      await copyStorageFile(original.s3Key, newS3Key);
      copiedS3Keys.push(newS3Key);
    }

    const [created] = await (tx as unknown as typeof db)
      .insert(files)
      .values({
        name: uniqueName,
        s3Key: newS3Key,
        mimeType: original.mimeType,
        size: original.size,
        folderId: targetFolderId,
        isFolder: false,
        author,
      })
      .returning();

    return created;
  }

  // 폴더 복사: 먼저 폴더 생성 → 하위 항목 재귀 복사
  const [newFolder] = await (tx as unknown as typeof db)
    .insert(files)
    .values({
      name: uniqueName,
      folderId: targetFolderId,
      isFolder: true,
      author,
    })
    .returning();

  // 하위 항목 조회
  const children = await (tx as unknown as typeof db).query.files.findMany({
    where: and(eq(files.folderId, original.id), eq(files.deleted, false)),
  });

  for (const child of children) {
    await copyItem(tx, child, newFolder.id, author, copiedS3Keys);
  }

  return newFolder;
}

export default app;
