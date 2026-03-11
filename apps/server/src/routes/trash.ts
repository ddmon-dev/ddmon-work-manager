import { Hono } from "hono";
import { eq, desc } from "drizzle-orm";
import { db } from "../db";
import { libraryDocuments, files } from "../db/schema";
import { requireAuth } from "../middleware/auth";
import { successResponse } from "../lib/errors";
import { deleteFile } from "../lib/storage";
import type { AppVariables } from "../lib/types";

const app = new Hono<{ Variables: AppVariables }>();
app.use("*", requireAuth);

// GET / — 휴지통 목록
app.get("/", async (c) => {
  const [trashedDocs, trashedFiles] = await Promise.all([
    db.query.libraryDocuments.findMany({
      where: eq(libraryDocuments.deleted, true),
      orderBy: [desc(libraryDocuments.deletedAt)],
      columns: {
        id: true,
        title: true,
        deletedAt: true,
        boardId: true,
      },
    }),
    db.query.files.findMany({
      where: eq(files.deleted, true),
      orderBy: [desc(files.deletedAt)],
      columns: {
        id: true,
        name: true,
        isFolder: true,
        mimeType: true,
        size: true,
        deletedAt: true,
      },
    }),
  ]);

  const items = [
    ...trashedDocs.map((d) => ({ ...d, type: "document" as const })),
    ...trashedFiles.map((f) => ({ ...f, type: "file" as const })),
  ].sort(
    (a, b) =>
      new Date(b.deletedAt!).getTime() - new Date(a.deletedAt!).getTime()
  );

  return successResponse(c, { items });
});

// DELETE /empty — 휴지통 비우기
app.delete("/empty", async (c) => {
  // 파일 영구 삭제 (MinIO + DB)
  const trashedFiles = await db.query.files.findMany({
    where: eq(files.deleted, true),
  });

  for (const file of trashedFiles) {
    if (file.s3Key) {
      await deleteFile(file.s3Key);
    }
  }

  await db.delete(files).where(eq(files.deleted, true));
  await db.delete(libraryDocuments).where(eq(libraryDocuments.deleted, true));

  return successResponse(c, { success: true });
});

export default app;
