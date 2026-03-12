import { Hono } from "hono";
import { and, eq, desc } from "drizzle-orm";
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
        folderId: true,
      },
    }),
  ]);

  // 부모도 삭제된 항목은 제외 → 최상위 삭제 항목만 표시
  const deletedFileIds = new Set(trashedFiles.map((f) => f.id));
  const topLevelFiles = trashedFiles.filter(
    (f) => !f.folderId || !deletedFileIds.has(f.folderId)
  );

  const items = [
    ...trashedDocs.map((d) => ({ ...d, type: "document" as const })),
    ...topLevelFiles.map(({ folderId: _, ...f }) => ({ ...f, type: "file" as const })),
  ].sort(
    (a, b) =>
      new Date(b.deletedAt!).getTime() - new Date(a.deletedAt!).getTime()
  );

  return successResponse(c, { items });
});

// DELETE /empty — 휴지통 비우기
app.delete("/empty", async (c) => {
  const trashedFiles = await db.query.files.findMany({
    where: eq(files.deleted, true),
    columns: { id: true, s3Key: true, isFolder: true, folderId: true },
  });

  // FK RESTRICT 대응: 파일 먼저 삭제 → 폴더를 리프부터 삭제
  const nonFolders = trashedFiles.filter((f) => !f.isFolder);
  if (nonFolders.length > 0) {
    await db.delete(files).where(and(eq(files.deleted, true), eq(files.isFolder, false)));
  }

  let remainingFolders = trashedFiles.filter((f) => f.isFolder);
  while (remainingFolders.length > 0) {
    const leaves = remainingFolders.filter(
      (f) => !remainingFolders.some((other) => other.folderId === f.id)
    );
    if (leaves.length === 0) break;
    for (const leaf of leaves) {
      await db.delete(files).where(eq(files.id, leaf.id));
    }
    const leafIds = new Set(leaves.map((l) => l.id));
    remainingFolders = remainingFolders.filter((f) => !leafIds.has(f.id));
  }

  await db.delete(libraryDocuments).where(eq(libraryDocuments.deleted, true));

  // 스토리지 정리 (실패해도 warn만)
  for (const file of trashedFiles) {
    if (file.s3Key) {
      try {
        await deleteFile(file.s3Key);
      } catch (err) {
        console.warn(`[Storage] Failed to delete: ${file.s3Key}`, err);
      }
    }
  }

  return successResponse(c, { success: true });
});

export default app;
