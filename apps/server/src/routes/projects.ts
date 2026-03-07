import { Hono } from "hono";
import { z } from "zod";
import { and, count, desc, eq, inArray } from "drizzle-orm";
import { db } from "../db";
import { projects, projectPayments, projectMemos, user } from "../db/schema";
import { requireAuth } from "../middleware/auth";
import { projectWriteSchema } from "@packages/schemas";
import { parsePagination, calcOffset } from "../lib/pagination";
import { successResponse, errorResponse, ERRORS } from "../lib/errors";
import { searchFilter, softDeleteFilter, softDeletePayload } from "../lib/query-helpers";
import { generateProjectNumber } from "../lib/number-generator";
import type { AppVariables } from "../lib/types";

const app = new Hono<{ Variables: AppVariables }>();
app.use("*", requireAuth);

// GET /projects — 목록 (payments 합계 포함)
app.get("/", async (c) => {
  const { page, pageSize, search } = parsePagination(c.req.query());
  const offset = calcOffset(page, pageSize);

  const where = and(
    softDeleteFilter(projects.deleted),
    search ? searchFilter([projects.name], search) : undefined
  );

  const [rows, countRows] = await Promise.all([
    db.query.projects.findMany({
      where,
      with: {
        client: true,
        payments: {
          where: softDeleteFilter(projectPayments.deleted),
          columns: { amount: true },
        },
      },
      orderBy: [desc(projects.createdAt)],
      limit: pageSize,
      offset,
    }),
    db.select({ total: count() }).from(projects).where(where),
  ]);

  // payments 합계 계산
  const items = rows.map((p) => ({
    ...p,
    totalPaid: p.payments.reduce((acc, pay) => acc + Number(pay.amount), 0),
    payments: undefined, // 목록에서는 상세 제거
  }));

  return successResponse(c, { items, total: countRows[0].total, page, pageSize });
});

// PUT /projects/reorder — 프로젝트 순서 일괄 변경
const projectReorderSchema = z.object({
  items: z.array(z.object({ id: z.string().uuid(), sortOrder: z.number().int() })),
});

app.put("/reorder", async (c) => {
  const parsed = projectReorderSchema.safeParse(await c.req.json());
  if (!parsed.success) return errorResponse(c, ERRORS.VALIDATION, 400);

  const user = c.get("user");
  await Promise.all(
    parsed.data.items.map(({ id, sortOrder }) =>
      db.update(projects)
        .set({ sortOrder, updatedBy: user.id, updatedAt: new Date() })
        .where(eq(projects.id, id))
    )
  );

  return successResponse(c, { updated: parsed.data.items.length });
});

// 서브 리소스 직접 라우트 — /:id 전에 등록

// PATCH /projects/payments/:id — 수금 수정
app.patch("/payments/:id", async (c) => {
  const id = c.req.param("id");
  const parsed = z.object({
    description: z.string().min(1).optional(),
    amount: z.number().positive().optional(),
    paidDate: z.string().optional(),
  }).safeParse(await c.req.json());
  if (!parsed.success) return errorResponse(c, ERRORS.VALIDATION, 400);

  const { amount, ...rest } = parsed.data;
  const [updated] = await db
    .update(projectPayments)
    .set({
      ...rest,
      ...(amount !== undefined && { amount: String(amount) }),
      updatedAt: new Date(),
    })
    .where(and(eq(projectPayments.id, id), softDeleteFilter(projectPayments.deleted)))
    .returning();

  if (!updated) return errorResponse(c, ERRORS.NOT_FOUND, 404);
  return successResponse(c, updated);
});

// DELETE /projects/payments/:id — 수금 소프트 삭제
app.delete("/payments/:id", async (c) => {
  const id = c.req.param("id");
  const [deleted] = await db
    .update(projectPayments)
    .set(softDeletePayload())
    .where(and(eq(projectPayments.id, id), softDeleteFilter(projectPayments.deleted)))
    .returning();

  if (!deleted) return errorResponse(c, ERRORS.NOT_FOUND, 404);
  return successResponse(c, { id });
});

// PATCH /projects/memos/:id — 메모 수정
app.patch("/memos/:id", async (c) => {
  const id = c.req.param("id");
  const parsed = z.object({ content: z.string().min(1) }).safeParse(await c.req.json());
  if (!parsed.success) return errorResponse(c, ERRORS.VALIDATION, 400);

  const [updated] = await db
    .update(projectMemos)
    .set({ content: parsed.data.content, updatedAt: new Date() })
    .where(and(eq(projectMemos.id, id), softDeleteFilter(projectMemos.deleted)))
    .returning();

  if (!updated) return errorResponse(c, ERRORS.NOT_FOUND, 404);
  return successResponse(c, updated);
});

// DELETE /projects/memos/:id — 메모 소프트 삭제
app.delete("/memos/:id", async (c) => {
  const id = c.req.param("id");
  const [deleted] = await db
    .update(projectMemos)
    .set(softDeletePayload())
    .where(and(eq(projectMemos.id, id), softDeleteFilter(projectMemos.deleted)))
    .returning();

  if (!deleted) return errorResponse(c, ERRORS.NOT_FOUND, 404);
  return successResponse(c, { id });
});

// GET /projects/:id — 상세 (payments, memos 포함)
app.get("/:id", async (c) => {
  const id = c.req.param("id");
  const project = await db.query.projects.findFirst({
    where: and(eq(projects.id, id), softDeleteFilter(projects.deleted)),
    with: {
      client: true,
      payments: {
        where: softDeleteFilter(projectPayments.deleted),
        orderBy: [desc(projectPayments.paidDate)],
      },
      memos: {
        where: softDeleteFilter(projectMemos.deleted),
        orderBy: [desc(projectMemos.createdAt)],
      },
    },
  });

  if (!project) return errorResponse(c, ERRORS.NOT_FOUND, 404);

  const authorIds = [...new Set(project.memos.map((m) => m.author).filter(Boolean))] as string[];
  const authors = authorIds.length > 0
    ? await db.select({ id: user.id, name: user.name, username: user.username }).from(user).where(inArray(user.id, authorIds))
    : [];
  const authorMap = Object.fromEntries(authors.map((a) => [a.id, `${a.name}(${a.username})`]));

  return successResponse(c, {
    ...project,
    memos: project.memos.map((m) => ({ ...m, author: m.author ? (authorMap[m.author] ?? m.author) : null })),
  });
});

// POST /projects — 생성 (projectNumber 자동 생성)
app.post("/", async (c) => {
  const user = c.get("user");
  const parsed = projectWriteSchema.safeParse(await c.req.json());
  if (!parsed.success) return errorResponse(c, ERRORS.VALIDATION, 400);

  const project = await db.transaction(async (tx) => {
    const projectNumber = await generateProjectNumber(tx);
    const [created] = await tx
      .insert(projects)
      .values({
        ...parsed.data,
        contractAmount: parsed.data.contractAmount?.toString(),
        projectNumber,
        author: user.id,
      })
      .returning();
    return created;
  });

  return successResponse(c, project, 201);
});

// PATCH /projects/:id — 수정
app.patch("/:id", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const parsed = projectWriteSchema.partial().safeParse(await c.req.json());
  if (!parsed.success) return errorResponse(c, ERRORS.VALIDATION, 400);

  const { contractAmount, ...rest } = parsed.data;
  const setValues = {
    ...rest,
    ...(contractAmount !== undefined && {
      contractAmount: contractAmount != null ? String(contractAmount) : null,
    }),
    updatedBy: user.id,
    updatedAt: new Date(),
  };

  const [updated] = await db
    .update(projects)
    .set(setValues)
    .where(and(eq(projects.id, id), softDeleteFilter(projects.deleted)))
    .returning();

  if (!updated) return errorResponse(c, ERRORS.NOT_FOUND, 404);
  return successResponse(c, updated);
});

// DELETE /projects/:id — 소프트 삭제
app.delete("/:id", async (c) => {
  const id = c.req.param("id");
  const [deleted] = await db
    .update(projects)
    .set(softDeletePayload())
    .where(and(eq(projects.id, id), softDeleteFilter(projects.deleted)))
    .returning();

  if (!deleted) return errorResponse(c, ERRORS.NOT_FOUND, 404);
  return successResponse(c, { id });
});

// PATCH /projects/:id/status — 상태/단계 변경
app.patch("/:id/status", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const parsed = z.object({
    status: z.enum(["pending", "active", "settling", "completed", "discarded"]).optional(),
    workPhase: z.enum(["preparing", "working", "reviewing", "delivered"]).optional(),
  }).safeParse(await c.req.json());
  if (!parsed.success) return errorResponse(c, ERRORS.VALIDATION, 400);
  if (!parsed.data.status && !parsed.data.workPhase) {
    return errorResponse(c, ERRORS.VALIDATION, 400, "status 또는 workPhase가 필요합니다.");
  }

  const [updated] = await db
    .update(projects)
    .set({ ...parsed.data, updatedBy: user.id, updatedAt: new Date() })
    .where(and(eq(projects.id, id), softDeleteFilter(projects.deleted)))
    .returning();

  if (!updated) return errorResponse(c, ERRORS.NOT_FOUND, 404);
  return successResponse(c, updated);
});

// POST /projects/:id/payments — 수금 등록
app.post("/:id/payments", async (c) => {
  const projectId = c.req.param("id");
  const parsed = z.object({
    description: z.string().min(1, "설명을 입력해주세요."),
    amount: z.number().positive("금액은 양수여야 합니다."),
    paidDate: z.string(),
  }).safeParse(await c.req.json());
  if (!parsed.success) return errorResponse(c, ERRORS.VALIDATION, 400);

  const project = await db.query.projects.findFirst({
    where: and(eq(projects.id, projectId), softDeleteFilter(projects.deleted)),
  });
  if (!project) return errorResponse(c, ERRORS.NOT_FOUND, 404);

  const [payment] = await db
    .insert(projectPayments)
    .values({ projectId, ...parsed.data, amount: parsed.data.amount.toString() })
    .returning();

  return successResponse(c, payment, 201);
});

// POST /projects/:id/memos — 메모 생성
app.post("/:id/memos", async (c) => {
  const user = c.get("user");
  const parentId = c.req.param("id");
  const parsed = z.object({ content: z.string().min(1) }).safeParse(await c.req.json());
  if (!parsed.success) return errorResponse(c, ERRORS.VALIDATION, 400);

  const project = await db.query.projects.findFirst({
    where: and(eq(projects.id, parentId), softDeleteFilter(projects.deleted)),
  });
  if (!project) return errorResponse(c, ERRORS.NOT_FOUND, 404);

  const [memo] = await db
    .insert(projectMemos)
    .values({ parentId, content: parsed.data.content, author: user.id })
    .returning();

  return successResponse(c, memo, 201);
});

export default app;
