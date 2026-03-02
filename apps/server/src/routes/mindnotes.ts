import { Hono } from "hono";
import { and, eq, desc, sql } from "drizzle-orm";
import { db } from "../db";
import { mindnotes } from "../db/schema";
import { requireAuth } from "../middleware/auth";
import { mindnoteWriteSchema } from "@packages/schemas";
import { successResponse, errorResponse, ERRORS } from "../lib/errors";
import type { AppVariables } from "../lib/types";

const app = new Hono<{ Variables: AppVariables }>();
app.use("*", requireAuth);

// GET /mindnotes — 전체 목록 (createdAt desc)
app.get("/", async (c) => {
  const user = c.get("user");

  const items = await db.query.mindnotes.findMany({
    where: eq(mindnotes.userId, user.id),
    orderBy: [desc(mindnotes.createdAt)],
  });

  return successResponse(c, { items });
});

// GET /mindnotes/random — 랜덤 1건
app.get("/random", async (c) => {
  const user = c.get("user");

  const [mindnote] = await db
    .select()
    .from(mindnotes)
    .where(eq(mindnotes.userId, user.id))
    .orderBy(sql`random()`)
    .limit(1);

  return successResponse(c, { mindnote: mindnote ?? null });
});

// POST /mindnotes — 생성
app.post("/", async (c) => {
  const user = c.get("user");
  const parsed = mindnoteWriteSchema.safeParse(await c.req.json());
  if (!parsed.success) return errorResponse(c, ERRORS.VALIDATION, 400);

  const [created] = await db
    .insert(mindnotes)
    .values({ ...parsed.data, userId: user.id })
    .returning();

  return successResponse(c, created, 201);
});

// PATCH /mindnotes/:id — 수정
app.patch("/:id", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const parsed = mindnoteWriteSchema.safeParse(await c.req.json());
  if (!parsed.success) return errorResponse(c, ERRORS.VALIDATION, 400);

  const [updated] = await db
    .update(mindnotes)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(and(eq(mindnotes.id, id), eq(mindnotes.userId, user.id)))
    .returning();

  if (!updated) return errorResponse(c, ERRORS.NOT_FOUND, 404);
  return successResponse(c, updated);
});

// DELETE /mindnotes/:id — 하드 삭제
app.delete("/:id", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");

  const mindnote = await db.query.mindnotes.findFirst({
    where: and(eq(mindnotes.id, id), eq(mindnotes.userId, user.id)),
  });
  if (!mindnote) return errorResponse(c, ERRORS.NOT_FOUND, 404);

  await db.delete(mindnotes).where(eq(mindnotes.id, id));

  return successResponse(c, { id });
});

export default app;
