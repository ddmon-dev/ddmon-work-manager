import { Hono } from "hono";
import { and, eq, desc } from "drizzle-orm";
import { db } from "../db";
import { libraryDocuments } from "../db/schema";
import { requireAuth } from "../middleware/auth";
import { libraryDocumentWriteSchema } from "@packages/schemas";
import { successResponse, errorResponse, ERRORS } from "../lib/errors";
import type { AppVariables } from "../lib/types";

const app = new Hono<{ Variables: AppVariables }>();
app.use("*", requireAuth);

// GET / — 문서 목록 (boardId 필터)
app.get("/", async (c) => {
  const boardId = c.req.query("boardId");
  if (!boardId) return errorResponse(c, ERRORS.VALIDATION, 400);

  const items = await db.query.libraryDocuments.findMany({
    where: and(
      eq(libraryDocuments.boardId, boardId),
      eq(libraryDocuments.deleted, false)
    ),
    orderBy: [desc(libraryDocuments.updatedAt)],
    columns: {
      id: true,
      boardId: true,
      title: true,
      author: true,
      updatedBy: true,
      createdAt: true,
      updatedAt: true,
      sortOrder: true,
    },
  });

  return successResponse(c, { items });
});

// GET /:id — 문서 상세 (content 포함)
app.get("/:id", async (c) => {
  const id = c.req.param("id");

  const doc = await db.query.libraryDocuments.findFirst({
    where: eq(libraryDocuments.id, id),
  });

  if (!doc) return errorResponse(c, ERRORS.NOT_FOUND, 404);
  return successResponse(c, doc);
});

// POST / — 문서 생성
app.post("/", async (c) => {
  const user = c.get("user");
  const parsed = libraryDocumentWriteSchema.safeParse(await c.req.json());
  if (!parsed.success) return errorResponse(c, ERRORS.VALIDATION, 400);

  const [created] = await db
    .insert(libraryDocuments)
    .values({ ...parsed.data, author: user.name ?? undefined })
    .returning();

  return successResponse(c, created, 201);
});

// PATCH /:id — 문서 수정
app.patch("/:id", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const body = await c.req.json();

  const updateData: Record<string, unknown> = {
    updatedAt: new Date(),
    updatedBy: user.name ?? undefined,
  };

  if (body.title !== undefined) updateData.title = body.title;
  if (body.content !== undefined) updateData.content = body.content;

  const [updated] = await db
    .update(libraryDocuments)
    .set(updateData)
    .where(eq(libraryDocuments.id, id))
    .returning();

  if (!updated) return errorResponse(c, ERRORS.NOT_FOUND, 404);
  return successResponse(c, updated);
});

// DELETE /:id — 휴지통으로 이동
app.delete("/:id", async (c) => {
  const id = c.req.param("id");

  const [updated] = await db
    .update(libraryDocuments)
    .set({ deleted: true, deletedAt: new Date(), updatedAt: new Date() })
    .where(eq(libraryDocuments.id, id))
    .returning();

  if (!updated) return errorResponse(c, ERRORS.NOT_FOUND, 404);
  return successResponse(c, { id });
});

// PATCH /:id/move — 게시판 이동
app.patch("/:id/move", async (c) => {
  const id = c.req.param("id");
  const { boardId } = (await c.req.json()) as { boardId: string };

  const [updated] = await db
    .update(libraryDocuments)
    .set({ boardId, updatedAt: new Date() })
    .where(eq(libraryDocuments.id, id))
    .returning();

  if (!updated) return errorResponse(c, ERRORS.NOT_FOUND, 404);
  return successResponse(c, updated);
});

// PATCH /:id/restore — 휴지통에서 복원
app.patch("/:id/restore", async (c) => {
  const id = c.req.param("id");

  const [updated] = await db
    .update(libraryDocuments)
    .set({ deleted: false, deletedAt: null, updatedAt: new Date() })
    .where(eq(libraryDocuments.id, id))
    .returning();

  if (!updated) return errorResponse(c, ERRORS.NOT_FOUND, 404);
  return successResponse(c, updated);
});

// DELETE /:id/permanent — 영구 삭제
app.delete("/:id/permanent", async (c) => {
  const id = c.req.param("id");

  const doc = await db.query.libraryDocuments.findFirst({
    where: eq(libraryDocuments.id, id),
  });
  if (!doc) return errorResponse(c, ERRORS.NOT_FOUND, 404);

  await db.delete(libraryDocuments).where(eq(libraryDocuments.id, id));

  return successResponse(c, { id });
});

export default app;
