import { Hono } from "hono";
import { z } from "zod";
import { and, count, desc, eq, inArray } from "drizzle-orm";
import { db } from "../db";
import { partners, partnerMemos, projectPartners, user } from "../db/schema";
import { requireAuth } from "../middleware/auth";
import { partnerWriteSchema } from "@packages/schemas";
import { parsePagination, calcOffset } from "../lib/pagination";
import { successResponse, errorResponse, ERRORS } from "../lib/errors";
import { searchFilter, softDeleteFilter, softDeletePayload } from "../lib/query-helpers";
import type { AppVariables } from "../lib/types";

const app = new Hono<{ Variables: AppVariables }>();
app.use("*", requireAuth);

// GET /partners — 목록 (페이지네이션, 검색)
app.get("/", async (c) => {
  const { page, pageSize, search } = parsePagination(c.req.query());
  const offset = calcOffset(page, pageSize);

  const where = and(
    softDeleteFilter(partners.deleted),
    search
      ? searchFilter([partners.name, partners.phone], search)
      : undefined
  );

  const [items, [{ total }]] = await Promise.all([
    db.select().from(partners).where(where).orderBy(desc(partners.createdAt)).limit(pageSize).offset(offset),
    db.select({ total: count() }).from(partners).where(where),
  ]);

  return successResponse(c, { items, total, page, pageSize });
});

// 메모 라우트 — /:id 보다 먼저 등록 (라우트 충돌 방지)

// PATCH /partners/memos/:id — 메모 수정
app.patch("/memos/:id", async (c) => {
  const id = c.req.param("id");
  const parsed = z.object({ content: z.string().min(1) }).safeParse(await c.req.json());
  if (!parsed.success) return errorResponse(c, ERRORS.VALIDATION, 400);

  const [updated] = await db
    .update(partnerMemos)
    .set({ content: parsed.data.content, updatedAt: new Date() })
    .where(and(eq(partnerMemos.id, id), softDeleteFilter(partnerMemos.deleted)))
    .returning();

  if (!updated) return errorResponse(c, ERRORS.NOT_FOUND, 404);
  return successResponse(c, updated);
});

// DELETE /partners/memos/:id — 메모 소프트 삭제
app.delete("/memos/:id", async (c) => {
  const id = c.req.param("id");
  const [deleted] = await db
    .update(partnerMemos)
    .set(softDeletePayload())
    .where(and(eq(partnerMemos.id, id), softDeleteFilter(partnerMemos.deleted)))
    .returning();

  if (!deleted) return errorResponse(c, ERRORS.NOT_FOUND, 404);
  return successResponse(c, { id });
});

// GET /partners/:id — 상세 (메모 포함)
app.get("/:id", async (c) => {
  const id = c.req.param("id");
  const partner = await db.query.partners.findFirst({
    where: and(eq(partners.id, id), softDeleteFilter(partners.deleted)),
    with: {
      memos: {
        where: softDeleteFilter(partnerMemos.deleted),
        orderBy: [desc(partnerMemos.createdAt)],
      },
    },
  });

  if (!partner) return errorResponse(c, ERRORS.NOT_FOUND, 404);

  const authorIds = [...new Set(partner.memos.map((m) => m.author).filter(Boolean))] as string[];
  const authors = authorIds.length > 0
    ? await db.select({ id: user.id, name: user.name, username: user.username }).from(user).where(inArray(user.id, authorIds))
    : [];
  const authorMap = Object.fromEntries(authors.map((a) => [a.id, `${a.name}(${a.username})`]));

  return successResponse(c, {
    ...partner,
    memos: partner.memos.map((m) => ({ ...m, author: m.author ? (authorMap[m.author] ?? m.author) : null })),
  });
});

// POST /partners — 생성
app.post("/", async (c) => {
  const user = c.get("user");
  const parsed = partnerWriteSchema.safeParse(await c.req.json());
  if (!parsed.success) return errorResponse(c, ERRORS.VALIDATION, 400);

  const [created] = await db
    .insert(partners)
    .values({ ...parsed.data, author: user.id })
    .returning();

  return successResponse(c, created, 201);
});

// PATCH /partners/:id — 수정
app.patch("/:id", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const parsed = partnerWriteSchema.partial().safeParse(await c.req.json());
  if (!parsed.success) return errorResponse(c, ERRORS.VALIDATION, 400);

  const [updated] = await db
    .update(partners)
    .set({ ...parsed.data, updatedBy: user.id, updatedAt: new Date() })
    .where(and(eq(partners.id, id), softDeleteFilter(partners.deleted)))
    .returning();

  if (!updated) return errorResponse(c, ERRORS.NOT_FOUND, 404);
  return successResponse(c, updated);
});

// DELETE /partners/:id — 소프트 삭제 (프로젝트 배치 여부 체크)
app.delete("/:id", async (c) => {
  const id = c.req.param("id");

  // 프로젝트에 배치된 파트너는 삭제 불가
  const [assignment] = await db
    .select({ id: projectPartners.id })
    .from(projectPartners)
    .where(eq(projectPartners.partnerId, id))
    .limit(1);

  if (assignment) {
    return errorResponse(c, ERRORS.PARTNER_HAS_ASSIGNMENTS, 409);
  }

  const [deleted] = await db
    .update(partners)
    .set(softDeletePayload())
    .where(and(eq(partners.id, id), softDeleteFilter(partners.deleted)))
    .returning();

  if (!deleted) return errorResponse(c, ERRORS.NOT_FOUND, 404);
  return successResponse(c, { id });
});

// POST /partners/:id/memos — 메모 생성
app.post("/:id/memos", async (c) => {
  const user = c.get("user");
  const parentId = c.req.param("id");
  const parsed = z.object({ content: z.string().min(1) }).safeParse(await c.req.json());
  if (!parsed.success) return errorResponse(c, ERRORS.VALIDATION, 400);

  const parent = await db.query.partners.findFirst({
    where: and(eq(partners.id, parentId), softDeleteFilter(partners.deleted)),
  });
  if (!parent) return errorResponse(c, ERRORS.NOT_FOUND, 404);

  const [memo] = await db
    .insert(partnerMemos)
    .values({ parentId, content: parsed.data.content, author: user.id })
    .returning();

  return successResponse(c, memo, 201);
});

export default app;
