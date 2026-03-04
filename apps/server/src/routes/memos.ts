import { Hono } from "hono";
import { and, eq, desc } from "drizzle-orm";
import { db } from "../db";
import { memos } from "../db/schema";
import { requireAuth } from "../middleware/auth";
import { memoWriteSchema } from "@packages/schemas";
import { successResponse, errorResponse, ERRORS } from "../lib/errors";
import type { AppVariables } from "../lib/types";

const app = new Hono<{ Variables: AppVariables }>();
app.use("*", requireAuth);

// GET /memos — 전체 목록 (createdAt desc)
app.get("/", async (c) => {
  const user = c.get("user");

  const items = await db.query.memos.findMany({
    where: eq(memos.userId, user.id),
    orderBy: [desc(memos.createdAt)],
  });

  return successResponse(c, { items });
});

// POST /memos — 생성
app.post("/", async (c) => {
  const user = c.get("user");
  const parsed = memoWriteSchema.safeParse(await c.req.json());
  if (!parsed.success) return errorResponse(c, ERRORS.VALIDATION, 400);

  const [created] = await db
    .insert(memos)
    .values({ ...parsed.data, userId: user.id })
    .returning();

  return successResponse(c, created, 201);
});

// PATCH /memos/:id — 수정
app.patch("/:id", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const parsed = memoWriteSchema.safeParse(await c.req.json());
  if (!parsed.success) return errorResponse(c, ERRORS.VALIDATION, 400);

  const [updated] = await db
    .update(memos)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(and(eq(memos.id, id), eq(memos.userId, user.id)))
    .returning();

  if (!updated) return errorResponse(c, ERRORS.NOT_FOUND, 404);
  return successResponse(c, updated);
});

// DELETE /memos/:id — 하드 삭제
app.delete("/:id", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");

  const memo = await db.query.memos.findFirst({
    where: and(eq(memos.id, id), eq(memos.userId, user.id)),
  });
  if (!memo) return errorResponse(c, ERRORS.NOT_FOUND, 404);

  await db.delete(memos).where(eq(memos.id, id));

  return successResponse(c, { id });
});

export default app;
