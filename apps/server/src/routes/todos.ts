import { Hono } from "hono";
import { z } from "zod";
import { and, eq, lt, asc } from "drizzle-orm";
import { db } from "../db";
import { todos, todoTimeBlocks } from "../db/schema";
import { requireAuth } from "../middleware/auth";
import { todoWriteSchema } from "@work-manager/schemas";
import { successResponse, errorResponse, ERRORS } from "../lib/errors";
import type { AppVariables } from "../lib/types";

const app = new Hono<{ Variables: AppVariables }>();
app.use("*", requireAuth);

// GET /todos — 날짜별 투두 + 타임블록 조회 (?date=YYYY-MM-DD)
app.get("/", async (c) => {
  const user = c.get("user");
  const date = c.req.query("date");

  if (!date) return errorResponse(c, ERRORS.VALIDATION, 400, "date 파라미터가 필요합니다.");

  const items = await db.query.todos.findMany({
    where: and(eq(todos.userId, user.id), eq(todos.todoDate, date)),
    with: {
      timeBlocks: {
        where: eq(todoTimeBlocks.blockDate, date),
        orderBy: [asc(todoTimeBlocks.startSlot)],
      },
    },
    orderBy: [asc(todos.sortOrder), asc(todos.createdAt)],
  });

  return successResponse(c, items);
});

// GET /todos/incomplete — 미완료 투두 (?before=YYYY-MM-DD)
app.get("/incomplete", async (c) => {
  const user = c.get("user");
  const before = c.req.query("before");

  if (!before) return errorResponse(c, ERRORS.VALIDATION, 400, "before 파라미터가 필요합니다.");

  const items = await db.query.todos.findMany({
    where: and(
      eq(todos.userId, user.id),
      eq(todos.completed, false),
      lt(todos.todoDate, before)
    ),
    orderBy: [asc(todos.todoDate), asc(todos.sortOrder)],
  });

  return successResponse(c, items);
});

// POST /todos/carry-over — 미완료 투두 이월
app.post("/carry-over", async (c) => {
  const user = c.get("user");
  const parsed = z.object({
    todoIds: z.array(z.string().uuid()),
    targetDate: z.string(),
  }).safeParse(await c.req.json());
  if (!parsed.success) return errorResponse(c, ERRORS.VALIDATION, 400);

  const { todoIds, targetDate } = parsed.data;

  await db.transaction(async (tx) => {
    // 타임블록 삭제 (해당 투두들의 모든 타임블록)
    for (const todoId of todoIds) {
      await tx.delete(todoTimeBlocks).where(eq(todoTimeBlocks.todoId, todoId));
    }
    // todoDate 변경
    for (const todoId of todoIds) {
      await tx
        .update(todos)
        .set({ todoDate: targetDate, updatedAt: new Date() })
        .where(and(eq(todos.id, todoId), eq(todos.userId, user.id)));
    }
  });

  return successResponse(c, { count: todoIds.length, targetDate });
});

// DELETE /todos/time-blocks/:id — 타임블록 하드 삭제 (/:id 전에 등록)
app.delete("/time-blocks/:id", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");

  const block = await db.query.todoTimeBlocks.findFirst({
    where: and(eq(todoTimeBlocks.id, id), eq(todoTimeBlocks.userId, user.id)),
  });
  if (!block) return errorResponse(c, ERRORS.NOT_FOUND, 404);

  await db.delete(todoTimeBlocks).where(eq(todoTimeBlocks.id, id));

  return successResponse(c, { id });
});

// POST /todos — 생성
app.post("/", async (c) => {
  const user = c.get("user");
  const parsed = todoWriteSchema.safeParse(await c.req.json());
  if (!parsed.success) return errorResponse(c, ERRORS.VALIDATION, 400);

  const [created] = await db
    .insert(todos)
    .values({ ...parsed.data, userId: user.id })
    .returning();

  return successResponse(c, created, 201);
});

// PATCH /todos/:id — 수정 (content, completed, sortOrder, color 부분 수정)
app.patch("/:id", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const parsed = z.object({
    content: z.string().min(1).optional(),
    completed: z.boolean().optional(),
    sortOrder: z.number().int().optional(),
    color: z.string().optional(),
  }).safeParse(await c.req.json());
  if (!parsed.success) return errorResponse(c, ERRORS.VALIDATION, 400);

  const [updated] = await db
    .update(todos)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(and(eq(todos.id, id), eq(todos.userId, user.id)))
    .returning();

  if (!updated) return errorResponse(c, ERRORS.NOT_FOUND, 404);
  return successResponse(c, updated);
});

// DELETE /todos/:id — 하드 삭제
app.delete("/:id", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");

  const todo = await db.query.todos.findFirst({
    where: and(eq(todos.id, id), eq(todos.userId, user.id)),
  });
  if (!todo) return errorResponse(c, ERRORS.NOT_FOUND, 404);

  await db.delete(todos).where(eq(todos.id, id));

  return successResponse(c, { id });
});

// PUT /todos/:id/time-block — 타임블록 upsert
app.put("/:id/time-block", async (c) => {
  const user = c.get("user");
  const todoId = c.req.param("id");
  const parsed = z.object({
    blockDate: z.string(),
    startSlot: z.number().int().min(0).max(47),
    durationSlots: z.number().int().min(1).default(2),
  }).safeParse(await c.req.json());
  if (!parsed.success) return errorResponse(c, ERRORS.VALIDATION, 400);

  const { blockDate, startSlot, durationSlots } = parsed.data;

  // 투두 소유권 확인
  const todo = await db.query.todos.findFirst({
    where: and(eq(todos.id, todoId), eq(todos.userId, user.id)),
  });
  if (!todo) return errorResponse(c, ERRORS.NOT_FOUND, 404);

  const [upserted] = await db
    .insert(todoTimeBlocks)
    .values({ todoId, userId: user.id, blockDate, startSlot, durationSlots })
    .onConflictDoUpdate({
      target: [todoTimeBlocks.todoId, todoTimeBlocks.blockDate],
      set: { startSlot, durationSlots, updatedAt: new Date() },
    })
    .returning();

  return successResponse(c, upserted);
});

export default app;
