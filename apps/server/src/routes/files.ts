import { Hono } from "hono";
import { and, eq, isNull, asc, desc, inArray } from "drizzle-orm";
import { db } from "../db";
import { files } from "../db/schema";
import { requireAuth } from "../middleware/auth";
import { fileRenameSchema, folderCreateSchema } from "@packages/schemas";
import { successResponse, errorResponse, ERRORS } from "../lib/errors";
import { uploadFile, deleteFile, getFile, STORAGE_CONFIG } from "../lib/storage";
import type { AppVariables } from "../lib/types";
import { randomUUID } from "crypto";

async function isDescendant(parentId: string | null, ancestorId: string): Promise<boolean> {
  let currentId = parentId;
  while (currentId) {
    if (currentId === ancestorId) return true;
    const folder = await db.query.files.findFirst({
      where: eq(files.id, currentId),
      columns: { folderId: true },
    });
    currentId = folder?.folderId ?? null;
  }
  return false;
}

/** 폴더와 하위 항목을 재귀적으로 소프트 삭제 */
async function softDeleteRecursive(folderId: string, deletedAt: Date) {
  const children = await db.query.files.findMany({
    where: and(eq(files.folderId, folderId), eq(files.deleted, false)),
    columns: { id: true, isFolder: true },
  });

  for (const child of children) {
    if (child.isFolder) {
      await softDeleteRecursive(child.id, deletedAt);
    }
  }

  if (children.length > 0) {
    await db
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
async function restoreRecursive(folderId: string, deletedAt: Date) {
  const children = await db.query.files.findMany({
    where: and(eq(files.folderId, folderId), eq(files.deleted, true), eq(files.deletedAt, deletedAt)),
    columns: { id: true, isFolder: true },
  });

  for (const child of children) {
    if (child.isFolder) {
      await restoreRecursive(child.id, deletedAt);
    }
  }

  if (children.length > 0) {
    const childIds = children.map((c) => c.id);
    await db
      .update(files)
      .set({ deleted: false, deletedAt: null, updatedAt: new Date() })
      .where(inArray(files.id, childIds));
  }
}

/** 폴더와 하위 항목을 재귀적으로 영구 삭제 (리프부터) */
async function permanentDeleteRecursive(folderId: string) {
  const children = await db.query.files.findMany({
    where: eq(files.folderId, folderId),
    columns: { id: true, isFolder: true, s3Key: true },
  });

  for (const child of children) {
    if (child.isFolder) {
      await permanentDeleteRecursive(child.id);
    }
  }

  // 파일 스토리지 정리
  for (const child of children) {
    if (child.s3Key) {
      try {
        await deleteFile(child.s3Key);
      } catch (err) {
        console.warn(`[Storage] Failed to delete file: ${child.s3Key}`, err);
      }
    }
  }

  // 자식 일괄 DB 삭제
  if (children.length > 0) {
    await db.delete(files).where(eq(files.folderId, folderId));
  }
}

const app = new Hono<{ Variables: AppVariables }>();
app.use("*", requireAuth);

// GET / — 파일/폴더 목록 (folderId 필터, null이면 루트)
app.get("/", async (c) => {
  const folderId = c.req.query("folderId") || null;
  const sort = c.req.query("sort") ?? "name";
  const order = c.req.query("order") ?? "asc";

  const orderFn = order === "desc" ? desc : asc;
  const sortColumn =
    sort === "date"
      ? files.updatedAt
      : sort === "size"
        ? files.size
        : files.name;

  const items = await db.query.files.findMany({
    where: and(
      folderId ? eq(files.folderId, folderId) : isNull(files.folderId),
      eq(files.deleted, false)
    ),
    orderBy: [desc(files.isFolder), orderFn(sortColumn)],
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

  await uploadFile(s3Key, buffer, file.type);

  let created;
  try {
    [created] = await db
      .insert(files)
      .values({
        name: file.name,
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

  const [created] = await db
    .insert(files)
    .values({
      name: parsed.data.name,
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

// PATCH /:id — 이름 변경
app.patch("/:id", async (c) => {
  const id = c.req.param("id");
  const parsed = fileRenameSchema.safeParse(await c.req.json());
  if (!parsed.success) return errorResponse(c, ERRORS.VALIDATION, 400);

  const [updated] = await db
    .update(files)
    .set({ name: parsed.data.name, updatedAt: new Date() })
    .where(eq(files.id, id))
    .returning();

  if (!updated) return errorResponse(c, ERRORS.NOT_FOUND, 404);
  return successResponse(c, updated);
});

// PATCH /:id/move — 폴더 이동
app.patch("/:id/move", async (c) => {
  const id = c.req.param("id");
  const { folderId } = (await c.req.json()) as { folderId: string | null };

  if (id === folderId) {
    return errorResponse(c, ERRORS.VALIDATION, 400, "자기 자신으로 이동할 수 없습니다.");
  }

  if (folderId && (await isDescendant(folderId, id))) {
    return errorResponse(c, ERRORS.CIRCULAR_REFERENCE, 400);
  }

  const [updated] = await db
    .update(files)
    .set({ folderId, updatedAt: new Date() })
    .where(eq(files.id, id))
    .returning();

  if (!updated) return errorResponse(c, ERRORS.NOT_FOUND, 404);
  return successResponse(c, updated);
});

// DELETE /:id — 휴지통으로 이동
app.delete("/:id", async (c) => {
  const id = c.req.param("id");
  const deletedAt = new Date();

  const target = await db.query.files.findFirst({
    where: eq(files.id, id),
    columns: { id: true, isFolder: true },
  });
  if (!target) return errorResponse(c, ERRORS.NOT_FOUND, 404);

  // 폴더면 하위 항목도 재귀적으로 소프트 삭제
  if (target.isFolder) {
    await softDeleteRecursive(id, deletedAt);
  }

  await db
    .update(files)
    .set({ deleted: true, deletedAt, updatedAt: new Date() })
    .where(eq(files.id, id));

  return successResponse(c, { id });
});

// PATCH /:id/restore — 휴지통에서 복원
app.patch("/:id/restore", async (c) => {
  const id = c.req.param("id");

  const target = await db.query.files.findFirst({
    where: eq(files.id, id),
    columns: { id: true, isFolder: true, deletedAt: true },
  });
  if (!target) return errorResponse(c, ERRORS.NOT_FOUND, 404);

  // 폴더면 같은 deletedAt 타임스탬프를 가진 하위 항목도 함께 복원
  if (target.isFolder && target.deletedAt) {
    await restoreRecursive(id, target.deletedAt);
  }

  const [updated] = await db
    .update(files)
    .set({ deleted: false, deletedAt: null, updatedAt: new Date() })
    .where(eq(files.id, id))
    .returning();

  return successResponse(c, updated!);
});

// DELETE /:id/permanent — 영구 삭제
app.delete("/:id/permanent", async (c) => {
  const id = c.req.param("id");

  const file = await db.query.files.findFirst({
    where: eq(files.id, id),
  });
  if (!file) return errorResponse(c, ERRORS.NOT_FOUND, 404);

  // 폴더면 하위 항목부터 재귀 삭제 (FK RESTRICT 대응)
  if (file.isFolder) {
    await permanentDeleteRecursive(id);
  }

  await db.delete(files).where(eq(files.id, id));

  if (file.s3Key) {
    try {
      await deleteFile(file.s3Key);
    } catch (err) {
      console.warn(`[Storage] Failed to delete file: ${file.s3Key}`, err);
    }
  }

  return successResponse(c, { id });
});

export default app;
