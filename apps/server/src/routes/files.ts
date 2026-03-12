import { Hono } from "hono";
import { and, eq, isNull, asc, desc, inArray, sql } from "drizzle-orm";
import { db } from "../db";
import { files } from "../db/schema";
import { requireAuth } from "../middleware/auth";
import { fileRenameSchema, folderCreateSchema, fileFavoriteSchema } from "@packages/schemas";
import { successResponse, errorResponse, ERRORS } from "../lib/errors";
import { uploadFile, deleteFile, getFile, openFileNative, STORAGE_CONFIG } from "../lib/storage";
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

/** 폴더와 하위 항목을 재귀적으로 소프트 삭제 */
async function softDeleteRecursive(tx: DbTransaction, folderId: string, deletedAt: Date) {
  const children = await tx.query.files.findMany({
    where: and(eq(files.folderId, folderId), eq(files.deleted, false)),
    columns: { id: true, isFolder: true },
  });

  for (const child of children) {
    if (child.isFolder) {
      await softDeleteRecursive(tx, child.id, deletedAt);
    }
  }

  if (children.length > 0) {
    await tx
      .update(files)
      .set({ deleted: true, deletedAt, updatedAt: new Date() })
      .where(
        and(
          eq(files.folderId, folderId),
          eq(files.deleted, false)
        )
      );
  }
}

/** 같은 deletedAt 타임스탬프를 가진 하위 항목을 재귀적으로 복원 */
async function restoreRecursive(tx: DbTransaction, folderId: string, deletedAt: Date) {
  const children = await tx.query.files.findMany({
    where: and(eq(files.folderId, folderId), eq(files.deleted, true), eq(files.deletedAt, deletedAt)),
    columns: { id: true, isFolder: true },
  });

  for (const child of children) {
    if (child.isFolder) {
      await restoreRecursive(tx, child.id, deletedAt);
    }
  }

  if (children.length > 0) {
    const childIds = children.map((c) => c.id);
    await tx
      .update(files)
      .set({ deleted: false, deletedAt: null, updatedAt: new Date() })
      .where(inArray(files.id, childIds));
  }
}

/** 폴더와 하위 항목을 재귀적으로 영구 삭제 (리프부터). 삭제할 s3Key 목록 반환 */
async function permanentDeleteRecursive(tx: DbTransaction, folderId: string): Promise<string[]> {
  const children = await tx.query.files.findMany({
    where: eq(files.folderId, folderId),
    columns: { id: true, isFolder: true, s3Key: true },
  });

  const s3Keys: string[] = [];

  for (const child of children) {
    if (child.isFolder) {
      const childKeys = await permanentDeleteRecursive(tx, child.id);
      s3Keys.push(...childKeys);
    }
    if (child.s3Key) {
      s3Keys.push(child.s3Key);
    }
  }

  // 자식 일괄 DB 삭제
  if (children.length > 0) {
    await tx.delete(files).where(eq(files.folderId, folderId));
  }

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
      orderBy: [desc(files.isFolder), asc(files.name)],
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

// GET /:id/path — 폴더 조상 경로
app.get("/:id/path", async (c) => {
  const id = c.req.param("id");
  const path: { id: string; name: string }[] = [];

  let currentId: string | null = id;
  while (currentId) {
    const folder: { id: string; name: string; folderId: string | null } | undefined =
      await db.query.files.findFirst({
        where: and(eq(files.id, currentId), eq(files.deleted, false)),
        columns: { id: true, name: true, folderId: true },
      });
    if (!folder) break;
    path.unshift({ id: folder.id, name: folder.name });
    currentId = folder.folderId;
  }

  return successResponse(c, { path });
});

// GET /:id/download — 파일 다운로드
app.get("/:id/download", async (c) => {
  const id = c.req.param("id");

  const file = await db.query.files.findFirst({
    where: eq(files.id, id),
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
    where: eq(files.id, id),
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

  const [updated] = await db
    .update(files)
    .set({ isFavorited: parsed.data.isFavorited, updatedAt: new Date() })
    .where(eq(files.id, id))
    .returning();

  if (!updated) return errorResponse(c, ERRORS.NOT_FOUND, 404);
  return successResponse(c, updated);
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
  for (const key of s3KeysToDelete) {
    try {
      await deleteFile(key);
    } catch (err) {
      console.warn(`[Storage] Failed to delete file: ${key}`, err);
    }
  }

  return successResponse(c, { id });
});

// POST /batch-delete — 배치 소프트 삭제 (트랜잭션)
app.post("/batch-delete", async (c) => {
  const { ids } = (await c.req.json()) as { ids: string[] };

  if (!Array.isArray(ids) || ids.length === 0) {
    return errorResponse(c, ERRORS.VALIDATION, 400);
  }

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
  const { ids, folderId } = (await c.req.json()) as { ids: string[]; folderId: string | null };

  if (!Array.isArray(ids) || ids.length === 0) {
    return errorResponse(c, ERRORS.VALIDATION, 400);
  }

  const duplicateNames: string[] = [];
  const movedIds: string[] = [];

  await db.transaction(async (tx) => {
    // 1단계: 충돌 사전 검증
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

    // 2단계: 전부 이동
    for (const id of ids) {
      if (id === folderId) continue;

      const target = await tx.query.files.findFirst({
        where: eq(files.id, id),
        columns: { isFolder: true },
      });
      if (!target) continue;

      if (target.isFolder && folderId && (await isDescendant(tx, folderId, id))) {
        continue;
      }

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

export default app;
