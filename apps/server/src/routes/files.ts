import { Hono } from "hono";
import { and, eq, isNull, asc, desc } from "drizzle-orm";
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

  const [created] = await db
    .insert(files)
    .values({
      name: parsed.data.name,
      folderId: parsed.data.folderId ?? null,
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
        where: eq(files.id, currentId),
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

  const [updated] = await db
    .update(files)
    .set({ deleted: true, deletedAt: new Date(), updatedAt: new Date() })
    .where(eq(files.id, id))
    .returning();

  if (!updated) return errorResponse(c, ERRORS.NOT_FOUND, 404);
  return successResponse(c, { id });
});

// PATCH /:id/restore — 휴지통에서 복원
app.patch("/:id/restore", async (c) => {
  const id = c.req.param("id");

  const [updated] = await db
    .update(files)
    .set({ deleted: false, deletedAt: null, updatedAt: new Date() })
    .where(eq(files.id, id))
    .returning();

  if (!updated) return errorResponse(c, ERRORS.NOT_FOUND, 404);
  return successResponse(c, updated);
});

// DELETE /:id/permanent — 영구 삭제
app.delete("/:id/permanent", async (c) => {
  const id = c.req.param("id");

  const file = await db.query.files.findFirst({
    where: eq(files.id, id),
  });
  if (!file) return errorResponse(c, ERRORS.NOT_FOUND, 404);

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
