import { Hono } from "hono";
import { z } from "zod";
import { and, count, desc, eq, gte, inArray, lte, or } from "drizzle-orm";
import { db } from "../db";
import { projects, projectInvoices, projectCollections, projectMemos, projectPartners, projectScheduleLanes, projectExpenses, partnerPayments, user } from "../db/schema";
import { requireAuthOrSkill } from "../middleware/skill-auth";
import { projectWriteSchema, projectPartnerWriteSchema } from "@packages/schemas";
import { parsePagination, calcOffset } from "../lib/pagination";
import { successResponse, errorResponse, ERRORS } from "../lib/errors";
import { searchFilter, softDeleteFilter, softDeletePayload, reorderSchema, executeReorder } from "../lib/query-helpers";
import { generateProjectNumber } from "../lib/number-generator";
import type { AppVariables } from "../lib/types";

const app = new Hono<{ Variables: AppVariables }>();
app.use("*", requireAuthOrSkill);

// GET /projects — 목록 (payments 합계 포함)
app.get("/", async (c) => {
  const { page, pageSize, search } = parsePagination(c.req.query());
  const offset = calcOffset(page, pageSize);

  const listQuerySchema = z.object({
    category: z.enum(["incomplete", "completed", "discarded"]).optional(),
    status: z.enum(["pending", "active", "settling", "completed", "discarded"]).optional(),
    clientId: z.string().uuid().optional(),
    amountMin: z.coerce.number().nonnegative().optional(),
    amountMax: z.coerce.number().nonnegative().optional(),
    contractFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    contractTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  });
  const filterParsed = listQuerySchema.safeParse(c.req.query());
  if (!filterParsed.success) return errorResponse(c, ERRORS.VALIDATION, 400);
  const { category, status, clientId, amountMin, amountMax, contractFrom, contractTo } = filterParsed.data;

  const categoryStatusMap: Record<string, string[]> = {
    incomplete: ["pending", "active", "settling"],
    completed: ["completed"],
    discarded: ["discarded"],
  };
  const categoryFilter = category && categoryStatusMap[category]
    ? inArray(projects.status, categoryStatusMap[category])
    : undefined;

  const where = and(
    softDeleteFilter(projects.deleted),
    search ? searchFilter([projects.name], search) : undefined,
    categoryFilter,
    status ? eq(projects.status, status) : undefined,
    clientId ? or(eq(projects.clientId, clientId), eq(projects.billingClientId, clientId)) : undefined,
    amountMin !== undefined ? gte(projects.contractAmount, String(amountMin)) : undefined,
    amountMax !== undefined ? lte(projects.contractAmount, String(amountMax)) : undefined,
    contractFrom ? gte(projects.contractDate, contractFrom) : undefined,
    contractTo ? lte(projects.contractDate, contractTo) : undefined,
  );

  const [rows, countRows] = await Promise.all([
    db.query.projects.findMany({
      where,
      with: {
        client: true,
        billingClient: { columns: { id: true, companyName: true } },
        collections: {
          where: softDeleteFilter(projectCollections.deleted),
          columns: { amount: true },
        },
      },
      orderBy: [desc(projects.createdAt)],
      limit: pageSize,
      offset,
    }),
    db.select({ total: count() }).from(projects).where(where),
  ]);

  const items = rows.map((p) => {
    const totalPaid = p.collections.reduce((acc, c) => acc + Number(c.amount), 0);
    return {
      ...p,
      totalPaid,
      collections: undefined,
    };
  });

  return successResponse(c, { items, total: countRows[0].total, page, pageSize });
});

// PUT /projects/reorder — 프로젝트 순서 일괄 변경
app.put("/reorder", async (c) => {
  const parsed = reorderSchema.safeParse(await c.req.json());
  if (!parsed.success) return errorResponse(c, ERRORS.VALIDATION, 400);

  const user = c.get("user");
  const result = await executeReorder(parsed.data.items, (id, sortOrder) =>
    db.update(projects)
      .set({ sortOrder, updatedBy: user.id, updatedAt: new Date() })
      .where(eq(projects.id, id))
  );

  return successResponse(c, result);
});

// 서브 리소스 직접 라우트 — /:id 전에 등록

// PATCH /projects/collections/:id — 수금 수정
app.patch("/collections/:id", async (c) => {
  const id = c.req.param("id");
  const parsed = z.object({
    description: z.string().optional(),
    amount: z.number().positive().optional(),
    paidDate: z.string().optional(),
    paymentType: z.enum(["deposit", "interim", "balance", "additional"]).optional(),
    invoiceId: z.string().uuid().nullable().optional(),
  }).safeParse(await c.req.json());
  if (!parsed.success) return errorResponse(c, ERRORS.VALIDATION, 400);

  const { amount, ...rest } = parsed.data;
  const [updated] = await db
    .update(projectCollections)
    .set({
      ...rest,
      ...(amount !== undefined && { amount: String(amount) }),
      updatedAt: new Date(),
    })
    .where(and(eq(projectCollections.id, id), softDeleteFilter(projectCollections.deleted)))
    .returning();

  if (!updated) return errorResponse(c, ERRORS.NOT_FOUND, 404);
  return successResponse(c, updated);
});

// DELETE /projects/collections/:id — 수금 소프트 삭제
app.delete("/collections/:id", async (c) => {
  const id = c.req.param("id");
  const [deleted] = await db
    .update(projectCollections)
    .set(softDeletePayload())
    .where(and(eq(projectCollections.id, id), softDeleteFilter(projectCollections.deleted)))
    .returning();

  if (!deleted) return errorResponse(c, ERRORS.NOT_FOUND, 404);
  return successResponse(c, { id });
});

// PATCH /projects/invoices/:id — 세금계산서 수정
app.patch("/invoices/:id", async (c) => {
  const id = c.req.param("id");
  const parsed = z.object({
    paymentType: z.enum(["deposit", "interim", "balance", "additional"]).optional(),
    description: z.string().optional(),
    amount: z.number().positive().optional(),
    issueDate: z.string().optional(),
  }).safeParse(await c.req.json());
  if (!parsed.success) return errorResponse(c, ERRORS.VALIDATION, 400);

  const { amount, ...rest } = parsed.data;
  const [updated] = await db
    .update(projectInvoices)
    .set({
      ...rest,
      ...(amount !== undefined && { amount: String(amount) }),
      updatedAt: new Date(),
    })
    .where(and(eq(projectInvoices.id, id), softDeleteFilter(projectInvoices.deleted)))
    .returning();

  if (!updated) return errorResponse(c, ERRORS.NOT_FOUND, 404);
  return successResponse(c, updated);
});

// DELETE /projects/invoices/:id — 세금계산서 소프트 삭제
app.delete("/invoices/:id", async (c) => {
  const id = c.req.param("id");

  // 활성 수금이 있으면 삭제 차단
  const [{ total }] = await db
    .select({ total: count() })
    .from(projectCollections)
    .where(and(eq(projectCollections.invoiceId, id), softDeleteFilter(projectCollections.deleted)));

  if (total > 0) {
    return errorResponse(c, { code: "HAS_COLLECTIONS", message: "수금 내역이 존재하는 세금계산서는 삭제할 수 없습니다. 수금 내역을 먼저 삭제해주세요." }, 400);
  }

  const [deleted] = await db
    .update(projectInvoices)
    .set(softDeletePayload())
    .where(and(eq(projectInvoices.id, id), softDeleteFilter(projectInvoices.deleted)))
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

// DELETE /projects/partners/:id — 파트너 배치 해제 (하드 삭제)
app.delete("/partners/:id", async (c) => {
  const id = c.req.param("id");

  const assignment = await db.query.projectPartners.findFirst({
    where: eq(projectPartners.id, id),
  });
  if (!assignment) return errorResponse(c, ERRORS.NOT_FOUND, 404);

  // 활성 지급내역이 있으면 배치 해제 차단
  const [{ total }] = await db
    .select({ total: count() })
    .from(partnerPayments)
    .where(and(
      eq(partnerPayments.projectId, assignment.projectId),
      eq(partnerPayments.partnerId, assignment.partnerId),
      softDeleteFilter(partnerPayments.deleted),
    ));

  if (total > 0) {
    return errorResponse(c, { code: "HAS_PAYMENTS", message: "지급내역이 존재하는 파트너는 배치 해제할 수 없습니다. 지급내역을 먼저 삭제해주세요." }, 400);
  }

  await db.delete(projectPartners).where(eq(projectPartners.id, id));
  return successResponse(c, { id });
});

// PATCH /projects/partners/:id — 파트너 배치 수정
app.patch("/partners/:id", async (c) => {
  const id = c.req.param("id");
  const parsed = z.object({
    roles: z.array(z.string()).optional(),
    amount: z.number().positive().nullable().optional(),
    taxType: z.enum(["withholding", "vat"]).optional(),
    notes: z.string().optional(),
  }).safeParse(await c.req.json());
  if (!parsed.success) return errorResponse(c, ERRORS.VALIDATION, 400);

  const { amount, ...rest } = parsed.data;
  const [updated] = await db
    .update(projectPartners)
    .set({
      ...rest,
      ...(amount !== undefined && { amount: amount != null ? String(amount) : null }),
    })
    .where(eq(projectPartners.id, id))
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

// PATCH /projects/expenses/:id — 지출 수정
app.patch("/expenses/:id", async (c) => {
  const id = c.req.param("id");
  const parsed = z.object({
    description: z.string().min(1).optional(),
    amount: z.number().positive().optional(),
    expenseDate: z.string().optional(),
  }).safeParse(await c.req.json());
  if (!parsed.success) return errorResponse(c, ERRORS.VALIDATION, 400);

  const { amount, ...rest } = parsed.data;
  const [updated] = await db
    .update(projectExpenses)
    .set({
      ...rest,
      ...(amount !== undefined && { amount: String(amount) }),
      updatedAt: new Date(),
    })
    .where(and(eq(projectExpenses.id, id), softDeleteFilter(projectExpenses.deleted)))
    .returning();

  if (!updated) return errorResponse(c, ERRORS.NOT_FOUND, 404);
  return successResponse(c, updated);
});

// DELETE /projects/expenses/:id — 지출 소프트 삭제
app.delete("/expenses/:id", async (c) => {
  const id = c.req.param("id");
  const [deleted] = await db
    .update(projectExpenses)
    .set(softDeletePayload())
    .where(and(eq(projectExpenses.id, id), softDeleteFilter(projectExpenses.deleted)))
    .returning();

  if (!deleted) return errorResponse(c, ERRORS.NOT_FOUND, 404);
  return successResponse(c, { id });
});

// PATCH /projects/partner-payments/:id — 파트너 지급 수정
app.patch("/partner-payments/:id", async (c) => {
  const id = c.req.param("id");
  const parsed = z.object({
    description: z.string().min(1).optional(),
    amount: z.number().positive().optional(),
    paidDate: z.string().optional(),
    withholdingReported: z.boolean().optional(),
    withholdingReportedDate: z.string().nullable().optional(),
  }).safeParse(await c.req.json());
  if (!parsed.success) return errorResponse(c, ERRORS.VALIDATION, 400);

  const { amount, ...rest } = parsed.data;
  const [updated] = await db
    .update(partnerPayments)
    .set({
      ...rest,
      ...(amount !== undefined && { amount: String(amount) }),
      updatedAt: new Date(),
    })
    .where(and(eq(partnerPayments.id, id), softDeleteFilter(partnerPayments.deleted)))
    .returning();

  if (!updated) return errorResponse(c, ERRORS.NOT_FOUND, 404);
  return successResponse(c, updated);
});

// DELETE /projects/partner-payments/:id — 파트너 지급 소프트 삭제
app.delete("/partner-payments/:id", async (c) => {
  const id = c.req.param("id");
  const [deleted] = await db
    .update(partnerPayments)
    .set(softDeletePayload())
    .where(and(eq(partnerPayments.id, id), softDeleteFilter(partnerPayments.deleted)))
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
      billingClient: { columns: { id: true, companyName: true } },
      invoices: {
        where: softDeleteFilter(projectInvoices.deleted),
        orderBy: [desc(projectInvoices.issueDate)],
      },
      collections: {
        where: softDeleteFilter(projectCollections.deleted),
        orderBy: [desc(projectCollections.paidDate)],
      },
      memos: {
        where: softDeleteFilter(projectMemos.deleted),
        orderBy: [desc(projectMemos.createdAt)],
      },
      expenses: {
        where: softDeleteFilter(projectExpenses.deleted),
        orderBy: [desc(projectExpenses.expenseDate)],
      },
      partnerPayments: {
        where: softDeleteFilter(partnerPayments.deleted),
        orderBy: [desc(partnerPayments.paidDate)],
        with: { partner: { columns: { id: true, name: true } } },
      },
      projectPartners: {
        with: { partner: true },
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

  // billingClientId === clientId 정규화
  if (parsed.data.billingClientId === parsed.data.clientId) {
    parsed.data.billingClientId = null;
  }

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
    await tx.insert(projectScheduleLanes).values({
      projectId: created.id,
      title: "",
      sortOrder: 0,
    });
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

  // billingClientId === clientId 정규화 (PATCH: 기존 clientId 참조)
  if (parsed.data.billingClientId) {
    const existing = await db.query.projects.findFirst({
      where: eq(projects.id, id),
      columns: { clientId: true },
    });
    if (existing && parsed.data.billingClientId === (parsed.data.clientId ?? existing.clientId)) {
      parsed.data.billingClientId = null;
    }
  }

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

// POST /projects/:id/collections — 수금 등록
app.post("/:id/collections", async (c) => {
  const projectId = c.req.param("id");
  const parsed = z.object({
    invoiceId: z.string().uuid().nullable().optional(),
    description: z.string().default(""),
    amount: z.number().positive("금액은 양수여야 합니다."),
    paidDate: z.string(),
    paymentType: z.enum(["deposit", "interim", "balance", "additional"]),
  }).safeParse(await c.req.json());
  if (!parsed.success) return errorResponse(c, ERRORS.VALIDATION, 400);

  const project = await db.query.projects.findFirst({
    where: and(eq(projects.id, projectId), softDeleteFilter(projects.deleted)),
  });
  if (!project) return errorResponse(c, ERRORS.NOT_FOUND, 404);

  const [collection] = await db
    .insert(projectCollections)
    .values({
      projectId,
      ...parsed.data,
      invoiceId: parsed.data.invoiceId ?? null,
      amount: parsed.data.amount.toString(),
    })
    .returning();

  return successResponse(c, collection, 201);
});

// POST /projects/:id/invoices — 세금계산서 발행
app.post("/:id/invoices", async (c) => {
  const projectId = c.req.param("id");
  const parsed = z.object({
    paymentType: z.enum(["deposit", "interim", "balance", "additional"]),
    description: z.string().default(""),
    amount: z.number().positive("금액은 양수여야 합니다."),
    issueDate: z.string(),
  }).safeParse(await c.req.json());
  if (!parsed.success) return errorResponse(c, ERRORS.VALIDATION, 400);

  const project = await db.query.projects.findFirst({
    where: and(eq(projects.id, projectId), softDeleteFilter(projects.deleted)),
  });
  if (!project) return errorResponse(c, ERRORS.NOT_FOUND, 404);

  const [invoice] = await db
    .insert(projectInvoices)
    .values({ projectId, ...parsed.data, amount: parsed.data.amount.toString() })
    .returning();

  return successResponse(c, invoice, 201);
});

// POST /projects/:id/expenses — 지출 등록
app.post("/:id/expenses", async (c) => {
  const projectId = c.req.param("id");
  const parsed = z.object({
    description: z.string().default(""),
    amount: z.number().positive("금액은 양수여야 합니다."),
    expenseDate: z.string(),
  }).safeParse(await c.req.json());
  if (!parsed.success) return errorResponse(c, ERRORS.VALIDATION, 400);

  const project = await db.query.projects.findFirst({
    where: and(eq(projects.id, projectId), softDeleteFilter(projects.deleted)),
  });
  if (!project) return errorResponse(c, ERRORS.NOT_FOUND, 404);

  const [expense] = await db
    .insert(projectExpenses)
    .values({
      projectId,
      ...parsed.data,
      amount: parsed.data.amount.toString(),
    })
    .returning();

  return successResponse(c, expense, 201);
});

// POST /projects/:id/partner-payments — 파트너 지급 등록
app.post("/:id/partner-payments", async (c) => {
  const projectId = c.req.param("id");
  const parsed = z.object({
    partnerId: z.string().uuid(),
    description: z.string().default(""),
    amount: z.number().positive("금액은 양수여야 합니다."),
    paidDate: z.string(),
  }).safeParse(await c.req.json());
  if (!parsed.success) return errorResponse(c, ERRORS.VALIDATION, 400);

  const project = await db.query.projects.findFirst({
    where: and(eq(projects.id, projectId), softDeleteFilter(projects.deleted)),
  });
  if (!project) return errorResponse(c, ERRORS.NOT_FOUND, 404);

  const [payment] = await db
    .insert(partnerPayments)
    .values({
      projectId,
      ...parsed.data,
      amount: parsed.data.amount.toString(),
    })
    .returning();

  return successResponse(c, payment, 201);
});

// GET /projects/:id/partners — 프로젝트 파트너 목록
app.get("/:id/partners", async (c) => {
  const projectId = c.req.param("id");
  const items = await db.query.projectPartners.findMany({
    where: eq(projectPartners.projectId, projectId),
    with: { partner: true },
  });

  return successResponse(c, items);
});

// POST /projects/:id/partners — 파트너 배치 (중복 체크)
app.post("/:id/partners", async (c) => {
  const projectId = c.req.param("id");
  const parsed = projectPartnerWriteSchema.safeParse(await c.req.json());
  if (!parsed.success) return errorResponse(c, ERRORS.VALIDATION, 400);

  // 프로젝트 존재 확인
  const project = await db.query.projects.findFirst({
    where: and(eq(projects.id, projectId), softDeleteFilter(projects.deleted)),
  });
  if (!project) return errorResponse(c, ERRORS.NOT_FOUND, 404);

  // 중복 배치 체크
  const [existing] = await db
    .select({ id: projectPartners.id })
    .from(projectPartners)
    .where(and(eq(projectPartners.projectId, projectId), eq(projectPartners.partnerId, parsed.data.partnerId)))
    .limit(1);

  if (existing) {
    return errorResponse(c, ERRORS.DUPLICATE_ASSIGNMENT, 409);
  }

  const { amount, ...rest } = parsed.data;
  const [created] = await db
    .insert(projectPartners)
    .values({
      projectId,
      ...rest,
      ...(amount != null && { amount: String(amount) }),
    })
    .returning();

  return successResponse(c, created, 201);
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
