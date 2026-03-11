import { Hono } from "hono";
import { and, eq, desc, lt } from "drizzle-orm";
import { db } from "../db";
import { libraryDocuments, files } from "../db/schema";
import { requireAuth } from "../middleware/auth";
import { successResponse } from "../lib/errors";
import { deleteFile } from "../lib/storage";
import type { AppVariables } from "../lib/types";

const app = new Hono<{ Variables: AppVariables }>();
app.use("*", requireAuth);

// GET / — 휴지통 목록 (30일 초과 항목 자동 정리)
app.get("/", async (c) => {
  // 30일 초과 항목 자동 정리
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // 만료된 파일 조회 (스토리지 정리용)
  const expiredFiles = await db.query.files.findMany({
    where: and(eq(files.deleted, true), lt(files.deletedAt, thirtyDaysAgo)),
    columns: { id: true, s3Key: true },
  });

  // DB 삭제 먼저 (source of truth)
  if (expiredFiles.length > 0) {
    await db.delete(files).where(
      and(eq(files.deleted, true), lt(files.deletedAt, thirtyDaysAgo))
    );
  }
  await db.delete(libraryDocuments).where(
    and(eq(libraryDocuments.deleted, true), lt(libraryDocuments.deletedAt, thirtyDaysAgo))
  );

  // 스토리지 정리 (실패해도 warn만)
  for (const file of expiredFiles) {
    if (file.s3Key) {
      try {
        await deleteFile(file.s3Key);
      } catch (err) {
        console.warn(`[Storage] Auto-cleanup failed: ${file.s3Key}`, err);
      }
    }
  }

  // 나머지 항목 조회
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
  const trashedFiles = await db.query.files.findMany({
    where: eq(files.deleted, true),
  });

  // DB 삭제 먼저 (source of truth)
  await db.delete(files).where(eq(files.deleted, true));
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
