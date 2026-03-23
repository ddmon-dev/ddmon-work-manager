import { Hono } from "hono";
import { z } from "zod";
import { and, count, desc, eq, inArray } from "drizzle-orm";
import { db } from "../db";
import { clientEnvironments, clientEnvironmentMemos, user } from "../db/schema";
import { requireAuth } from "../middleware/auth";
import { clientEnvironmentWriteSchema } from "@packages/schemas";
import type { CustomFieldCategory } from "@packages/schemas";
import { parsePagination, calcOffset } from "../lib/pagination";
import { successResponse, errorResponse, ERRORS } from "../lib/errors";
import { searchFilter, softDeleteFilter, softDeletePayload } from "../lib/query-helpers";
import type { AppVariables } from "../lib/types";

const app = new Hono<{ Variables: AppVariables }>();
app.use("*", requireAuth);

/** JSONB 빈 객체 → null 변환 */
function nullifyEmpty(obj: Record<string, unknown> | undefined | null) {
  if (!obj) return null;
  return Object.values(obj).some((v) => v !== undefined && v !== null && v !== "")
    ? obj
    : null;
}

function sanitizeJsonbFields(data: Record<string, unknown>) {
  const jsonbKeys = ["hosting", "domain", "ftp"] as const;
  const result = { ...data };
  for (const key of jsonbKeys) {
    if (key in result) {
      result[key] = nullifyEmpty(result[key] as Record<string, unknown> | undefined | null);
    }
  }
  // customFields: 빈 카테고리/항목 정리 (2중 구조)
  if ("customFields" in result) {
    const cf = result.customFields;
    if (Array.isArray(cf) && cf.length > 0) {
      const cleaned = (cf as CustomFieldCategory[])
        .map((cat) => ({
          ...cat,
          items: cat.items?.filter((item) => item.label || item.value) ?? [],
        }))
        .filter((cat) => cat.category && cat.items.length > 0);
      result.customFields = cleaned.length > 0 ? cleaned : null;
    } else {
      result.customFields = null;
    }
  }
  return result;
}

/** 평면 커스텀 필드를 카테고리별 그룹으로 변환 (기존 데이터 호환) */
function migrateCustomFields(fields: unknown): CustomFieldCategory[] | null {
  if (!Array.isArray(fields) || fields.length === 0) return null;

  // 이미 2중 구조인지 확인
  if (fields[0] && "items" in fields[0] && Array.isArray(fields[0].items)) {
    return fields as CustomFieldCategory[];
  }

  // 평면 구조를 카테고리별로 그룹핑
  const grouped = new Map<string, { label: string; value: string }[]>();
  for (const field of fields) {
    const { category, label, value } = field as { category: string; label: string; value: string };
    if (!grouped.has(category)) {
      grouped.set(category, []);
    }
    grouped.get(category)!.push({ label, value });
  }

  return Array.from(grouped.entries()).map(([category, items]) => ({
    category,
    items,
  }));
}

// GET / — 목록 (페이지네이션, 검색)
app.get("/", async (c) => {
  const { page, pageSize, search } = parsePagination(c.req.query());
  const offset = calcOffset(page, pageSize);

  const where = and(
    softDeleteFilter(clientEnvironments.deleted),
    search
      ? searchFilter([clientEnvironments.name, clientEnvironments.customerName], search)
      : undefined
  );

  const [items, [{ total }]] = await Promise.all([
    db
      .select({
        id: clientEnvironments.id,
        customerName: clientEnvironments.customerName,
        name: clientEnvironments.name,
        hosting: clientEnvironments.hosting,
        domain: clientEnvironments.domain,
        ftp: clientEnvironments.ftp,
        customFields: clientEnvironments.customFields,
        notes: clientEnvironments.notes,
        createdAt: clientEnvironments.createdAt,
        updatedAt: clientEnvironments.updatedAt,
      })
      .from(clientEnvironments)
      .where(where)
      .orderBy(desc(clientEnvironments.createdAt))
      .limit(pageSize)
      .offset(offset),
    db
      .select({ total: count() })
      .from(clientEnvironments)
      .where(where),
  ]);

  return successResponse(c, { items, total, page, pageSize });
});

// 메모 라우트 — /:id 보다 먼저 등록

// PATCH /client-environments/memos/:id
app.patch("/memos/:id", async (c) => {
  const id = c.req.param("id");
  const parsed = z.object({ content: z.string().min(1) }).safeParse(await c.req.json());
  if (!parsed.success) return errorResponse(c, ERRORS.VALIDATION, 400);

  const [updated] = await db
    .update(clientEnvironmentMemos)
    .set({ content: parsed.data.content, updatedAt: new Date() })
    .where(and(eq(clientEnvironmentMemos.id, id), softDeleteFilter(clientEnvironmentMemos.deleted)))
    .returning();

  if (!updated) return errorResponse(c, ERRORS.NOT_FOUND, 404);
  return successResponse(c, updated);
});

// DELETE /client-environments/memos/:id
app.delete("/memos/:id", async (c) => {
  const id = c.req.param("id");
  const [deleted] = await db
    .update(clientEnvironmentMemos)
    .set(softDeletePayload())
    .where(and(eq(clientEnvironmentMemos.id, id), softDeleteFilter(clientEnvironmentMemos.deleted)))
    .returning();

  if (!deleted) return errorResponse(c, ERRORS.NOT_FOUND, 404);
  return successResponse(c, { id });
});

// GET /:id — 상세 (memos)
app.get("/:id", async (c) => {
  const id = c.req.param("id");
  const env = await db.query.clientEnvironments.findFirst({
    where: and(eq(clientEnvironments.id, id), softDeleteFilter(clientEnvironments.deleted)),
    with: {
      memos: {
        where: softDeleteFilter(clientEnvironmentMemos.deleted),
        orderBy: [desc(clientEnvironmentMemos.createdAt)],
      },
    },
  });

  if (!env) return errorResponse(c, ERRORS.NOT_FOUND, 404);

  const authorIds = [...new Set(env.memos.map((m) => m.author).filter(Boolean))] as string[];
  const authors = authorIds.length > 0
    ? await db.select({ id: user.id, name: user.name, username: user.username }).from(user).where(inArray(user.id, authorIds))
    : [];
  const authorMap = Object.fromEntries(authors.map((a) => [a.id, `${a.name}(${a.username})`]));

  return successResponse(c, {
    ...env,
    customFields: migrateCustomFields(env.customFields),
    memos: env.memos.map((m) => ({ ...m, author: m.author ? (authorMap[m.author] ?? m.author) : null })),
  });
});

// POST / — 생성
app.post("/", async (c) => {
  const currentUser = c.get("user");
  const parsed = clientEnvironmentWriteSchema.safeParse(await c.req.json());
  if (!parsed.success) return errorResponse(c, ERRORS.VALIDATION, 400);

  const sanitized = sanitizeJsonbFields(parsed.data);
  const [created] = await db
    .insert(clientEnvironments)
    .values({ ...sanitized, author: currentUser.id } as typeof clientEnvironments.$inferInsert)
    .returning();

  return successResponse(c, created, 201);
});

// PATCH /:id — 수정
app.patch("/:id", async (c) => {
  const currentUser = c.get("user");
  const id = c.req.param("id");
  const parsed = clientEnvironmentWriteSchema.partial().safeParse(await c.req.json());
  if (!parsed.success) return errorResponse(c, ERRORS.VALIDATION, 400);

  const sanitized = sanitizeJsonbFields(parsed.data);
  const [updated] = await db
    .update(clientEnvironments)
    .set({ ...sanitized, updatedBy: currentUser.id, updatedAt: new Date() })
    .where(and(eq(clientEnvironments.id, id), softDeleteFilter(clientEnvironments.deleted)))
    .returning();

  if (!updated) return errorResponse(c, ERRORS.NOT_FOUND, 404);
  return successResponse(c, updated);
});

// DELETE /:id — 소프트 삭제
app.delete("/:id", async (c) => {
  const id = c.req.param("id");
  const [deleted] = await db
    .update(clientEnvironments)
    .set(softDeletePayload())
    .where(and(eq(clientEnvironments.id, id), softDeleteFilter(clientEnvironments.deleted)))
    .returning();

  if (!deleted) return errorResponse(c, ERRORS.NOT_FOUND, 404);
  return successResponse(c, { id });
});

// POST /:id/memos — 메모 생성
app.post("/:id/memos", async (c) => {
  const currentUser = c.get("user");
  const parentId = c.req.param("id");
  const parsed = z.object({ content: z.string().min(1) }).safeParse(await c.req.json());
  if (!parsed.success) return errorResponse(c, ERRORS.VALIDATION, 400);

  const parent = await db.query.clientEnvironments.findFirst({
    where: and(eq(clientEnvironments.id, parentId), softDeleteFilter(clientEnvironments.deleted)),
  });
  if (!parent) return errorResponse(c, ERRORS.NOT_FOUND, 404);

  const [memo] = await db
    .insert(clientEnvironmentMemos)
    .values({ parentId, content: parsed.data.content, author: currentUser.id })
    .returning();

  return successResponse(c, memo, 201);
});

export default app;
