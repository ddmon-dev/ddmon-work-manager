import { Hono } from "hono";
import { z } from "zod";
import { and, count, desc, eq, inArray } from "drizzle-orm";
import { db } from "../db";
import { clients, clientMemos, user } from "../db/schema";
import { requireAuth } from "../middleware/auth";
import { clientWriteSchema } from "@packages/schemas";
import { parsePagination, calcOffset } from "../lib/pagination";
import { successResponse, errorResponse, ERRORS } from "../lib/errors";
import { searchFilter, softDeleteFilter, softDeletePayload } from "../lib/query-helpers";
import type { AppVariables } from "../lib/types";

const app = new Hono<{ Variables: AppVariables }>();
app.use("*", requireAuth);

// GET /clients — 목록 (페이지네이션, 검색)
app.get("/", async (c) => {
  const { page, pageSize, search } = parsePagination(c.req.query());
  const offset = calcOffset(page, pageSize);

  const where = and(
    softDeleteFilter(clients.deleted),
    search
      ? searchFilter([clients.companyName, clients.contactName, clients.email], search)
      : undefined
  );

  const [items, [{ total }]] = await Promise.all([
    db.select().from(clients).where(where).orderBy(desc(clients.createdAt)).limit(pageSize).offset(offset),
    db.select({ total: count() }).from(clients).where(where),
  ]);

  return successResponse(c, { items, total, page, pageSize });
});

// 메모 라우트 — /:id 보다 먼저 등록 (라우트 충돌 방지)

// PATCH /clients/memos/:id — 메모 수정
app.patch("/memos/:id", async (c) => {
  const id = c.req.param("id");
  const parsed = z.object({ content: z.string().min(1) }).safeParse(await c.req.json());
  if (!parsed.success) return errorResponse(c, ERRORS.VALIDATION, 400);

  const [updated] = await db
    .update(clientMemos)
    .set({ content: parsed.data.content, updatedAt: new Date() })
    .where(and(eq(clientMemos.id, id), softDeleteFilter(clientMemos.deleted)))
    .returning();

  if (!updated) return errorResponse(c, ERRORS.NOT_FOUND, 404);
  return successResponse(c, updated);
});

// DELETE /clients/memos/:id — 메모 소프트 삭제
app.delete("/memos/:id", async (c) => {
  const id = c.req.param("id");
  const [deleted] = await db
    .update(clientMemos)
    .set(softDeletePayload())
    .where(and(eq(clientMemos.id, id), softDeleteFilter(clientMemos.deleted)))
    .returning();

  if (!deleted) return errorResponse(c, ERRORS.NOT_FOUND, 404);
  return successResponse(c, { id });
});

// GET /clients/:id — 상세 (메모 포함)
app.get("/:id", async (c) => {
  const id = c.req.param("id");
  const client = await db.query.clients.findFirst({
    where: and(eq(clients.id, id), softDeleteFilter(clients.deleted)),
    with: {
      memos: {
        where: softDeleteFilter(clientMemos.deleted),
        orderBy: [desc(clientMemos.createdAt)],
      },
    },
  });

  if (!client) return errorResponse(c, ERRORS.NOT_FOUND, 404);

  const authorIds = [...new Set(client.memos.map((m) => m.author).filter(Boolean))] as string[];
  const authors = authorIds.length > 0
    ? await db.select({ id: user.id, name: user.name, username: user.username }).from(user).where(inArray(user.id, authorIds))
    : [];
  const authorMap = Object.fromEntries(authors.map((a) => [a.id, `${a.name}(${a.username})`]));

  return successResponse(c, {
    ...client,
    memos: client.memos.map((m) => ({ ...m, author: m.author ? (authorMap[m.author] ?? m.author) : null })),
  });
});

// POST /clients — 생성
app.post("/", async (c) => {
  const user = c.get("user");
  const parsed = clientWriteSchema.safeParse(await c.req.json());
  if (!parsed.success) return errorResponse(c, ERRORS.VALIDATION, 400);

  const [created] = await db
    .insert(clients)
    .values({ ...parsed.data, author: user.id })
    .returning();

  return successResponse(c, created, 201);
});

// PATCH /clients/:id — 수정
app.patch("/:id", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const parsed = clientWriteSchema.partial().safeParse(await c.req.json());
  if (!parsed.success) return errorResponse(c, ERRORS.VALIDATION, 400);

  const [updated] = await db
    .update(clients)
    .set({ ...parsed.data, updatedBy: user.id, updatedAt: new Date() })
    .where(and(eq(clients.id, id), softDeleteFilter(clients.deleted)))
    .returning();

  if (!updated) return errorResponse(c, ERRORS.NOT_FOUND, 404);
  return successResponse(c, updated);
});

// DELETE /clients/:id — 소프트 삭제
app.delete("/:id", async (c) => {
  const id = c.req.param("id");
  const [deleted] = await db
    .update(clients)
    .set(softDeletePayload())
    .where(and(eq(clients.id, id), softDeleteFilter(clients.deleted)))
    .returning();

  if (!deleted) return errorResponse(c, ERRORS.NOT_FOUND, 404);
  return successResponse(c, { id });
});

// POST /clients/:id/memos — 메모 생성
app.post("/:id/memos", async (c) => {
  const user = c.get("user");
  const parentId = c.req.param("id");
  const parsed = z.object({ content: z.string().min(1) }).safeParse(await c.req.json());
  if (!parsed.success) return errorResponse(c, ERRORS.VALIDATION, 400);

  const parent = await db.query.clients.findFirst({
    where: and(eq(clients.id, parentId), softDeleteFilter(clients.deleted)),
  });
  if (!parent) return errorResponse(c, ERRORS.NOT_FOUND, 404);

  const [memo] = await db
    .insert(clientMemos)
    .values({ parentId, content: parsed.data.content, author: user.id })
    .returning();

  return successResponse(c, memo, 201);
});

export default app;
