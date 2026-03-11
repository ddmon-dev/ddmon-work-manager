import { Hono } from "hono";
import { eq, asc } from "drizzle-orm";
import { db } from "../db";
import { libraryBoards } from "../db/schema";
import { requireAuth } from "../middleware/auth";
import { libraryBoardWriteSchema } from "@packages/schemas";
import { successResponse, errorResponse, ERRORS } from "../lib/errors";
import type { AppVariables } from "../lib/types";

const app = new Hono<{ Variables: AppVariables }>();
app.use("*", requireAuth);

// GET / — 게시판 목록
app.get("/", async (c) => {
  const items = await db.query.libraryBoards.findMany({
    where: eq(libraryBoards.deleted, false),
    orderBy: [asc(libraryBoards.sortOrder), asc(libraryBoards.createdAt)],
  });

  return successResponse(c, { items });
});

// POST / — 게시판 생성
app.post("/", async (c) => {
  const parsed = libraryBoardWriteSchema.safeParse(await c.req.json());
  if (!parsed.success) return errorResponse(c, ERRORS.VALIDATION, 400);

  const [created] = await db
    .insert(libraryBoards)
    .values(parsed.data)
    .returning();

  return successResponse(c, created, 201);
});

// PATCH /:id — 게시판 수정
app.patch("/:id", async (c) => {
  const id = c.req.param("id");
  const parsed = libraryBoardWriteSchema.safeParse(await c.req.json());
  if (!parsed.success) return errorResponse(c, ERRORS.VALIDATION, 400);

  const [updated] = await db
    .update(libraryBoards)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(libraryBoards.id, id))
    .returning();

  if (!updated) return errorResponse(c, ERRORS.NOT_FOUND, 404);
  return successResponse(c, updated);
});

// DELETE /:id — 소프트 삭제
app.delete("/:id", async (c) => {
  const id = c.req.param("id");

  const [updated] = await db
    .update(libraryBoards)
    .set({ deleted: true, updatedAt: new Date() })
    .where(eq(libraryBoards.id, id))
    .returning();

  if (!updated) return errorResponse(c, ERRORS.NOT_FOUND, 404);
  return successResponse(c, { id });
});

// PUT /reorder — 순서 변경
app.put("/reorder", async (c) => {
  const body = (await c.req.json()) as { ids: string[] };
  if (!Array.isArray(body.ids)) return errorResponse(c, ERRORS.VALIDATION, 400);

  await Promise.all(
    body.ids.map((id, index) =>
      db
        .update(libraryBoards)
        .set({ sortOrder: index, updatedAt: new Date() })
        .where(eq(libraryBoards.id, id))
    )
  );

  return successResponse(c, { success: true });
});

export default app;
