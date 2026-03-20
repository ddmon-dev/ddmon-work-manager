import { Hono } from "hono";
import { z } from "zod";
import { and, eq, sql, inArray } from "drizzle-orm";
import { db } from "../db";
import {
  projects,
  projectInvoices,
  partnerPayments,
  clients,
  partners,
} from "../db/schema";
import { requireAuth } from "../middleware/auth";
import { successResponse, errorResponse, ERRORS } from "../lib/errors";
import { softDeleteFilter } from "../lib/query-helpers";
import type { AppVariables } from "../lib/types";

const app = new Hono<{ Variables: AppVariables }>();
app.use("*", requireAuth);

// GET /settlement?year=&month=
app.get("/", async (c) => {
  const currentDate = new Date();
  const yearParam = c.req.query("year");
  const monthParam = c.req.query("month");

  const yearParsed = z.coerce.number().int().min(2000).max(2100).safeParse(yearParam);
  const monthParsed = z.coerce.number().int().min(1).max(12).safeParse(monthParam);

  const year = yearParsed.success ? yearParsed.data : currentDate.getFullYear();
  const month = monthParsed.success ? monthParsed.data : currentDate.getMonth() + 1;

  const [uncollectedInvoices, unreportedPartnerPayments] = await Promise.all([
    // 미수금 세금계산서: VAT 프로젝트의 발행했지만 미수금인 건
    db
      .select({
        id: projectInvoices.id,
        projectId: projectInvoices.projectId,
        projectName: projects.name,
        clientName: clients.companyName,
        paymentType: projectInvoices.paymentType,
        amount: projectInvoices.amount,
        issueDate: projectInvoices.issueDate,
        description: projectInvoices.description,
      })
      .from(projectInvoices)
      .innerJoin(projects, eq(projectInvoices.projectId, projects.id))
      .leftJoin(clients, eq(projects.clientId, clients.id))
      .where(
        and(
          softDeleteFilter(projectInvoices.deleted),
          softDeleteFilter(projects.deleted),
          eq(projects.taxType, "vat"),
          sql`${projectInvoices.paidDate} IS NULL`,
          sql`EXTRACT(YEAR FROM ${projectInvoices.issueDate}::date) = ${year}`,
          sql`EXTRACT(MONTH FROM ${projectInvoices.issueDate}::date) = ${month}`
        )
      )
      .orderBy(projectInvoices.issueDate),

    // 원천세 미신고: 파트너 지급 건
    db
      .select({
        id: partnerPayments.id,
        projectId: partnerPayments.projectId,
        projectName: projects.name,
        partnerName: partners.name,
        amount: partnerPayments.amount,
        paidDate: partnerPayments.paidDate,
        description: partnerPayments.description,
      })
      .from(partnerPayments)
      .innerJoin(projects, eq(partnerPayments.projectId, projects.id))
      .innerJoin(partners, eq(partnerPayments.partnerId, partners.id))
      .where(
        and(
          softDeleteFilter(partnerPayments.deleted),
          softDeleteFilter(projects.deleted),
          eq(partnerPayments.withholdingReported, false),
          sql`EXTRACT(YEAR FROM ${partnerPayments.paidDate}::date) = ${year}`,
          sql`EXTRACT(MONTH FROM ${partnerPayments.paidDate}::date) = ${month}`
        )
      )
      .orderBy(partnerPayments.paidDate),
  ]);

  const summary = {
    uncollectedCount: uncollectedInvoices.length,
    unreportedCount: unreportedPartnerPayments.length,
  };

  return successResponse(c, {
    uncollectedInvoices,
    unreportedPartnerPayments,
    summary,
  });
});

// PATCH /settlement/collections/batch — 미수금 세금계산서 수금 완료 처리
app.patch("/collections/batch", async (c) => {
  const body = await c.req.json();
  const schema = z.object({
    invoiceIds: z.array(z.string().uuid()).min(1),
    paidDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  });

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(c, ERRORS.VALIDATION, 400);
  }

  const { invoiceIds, paidDate } = parsed.data;

  await db
    .update(projectInvoices)
    .set({
      paidDate,
      updatedAt: new Date(),
    })
    .where(inArray(projectInvoices.id, invoiceIds));

  return successResponse(c, { updated: invoiceIds.length });
});

// PATCH /settlement/withholdings/batch
app.patch("/withholdings/batch", async (c) => {
  const body = await c.req.json();
  const schema = z.object({
    partnerPaymentIds: z.array(z.string().uuid()).min(1),
    reportedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  });

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(c, ERRORS.VALIDATION, 400);
  }

  const { partnerPaymentIds, reportedDate } = parsed.data;

  await db
    .update(partnerPayments)
    .set({
      withholdingReported: true,
      withholdingReportedDate: reportedDate,
      updatedAt: new Date(),
    })
    .where(inArray(partnerPayments.id, partnerPaymentIds));

  return successResponse(c, { updated: partnerPaymentIds.length });
});

export default app;
