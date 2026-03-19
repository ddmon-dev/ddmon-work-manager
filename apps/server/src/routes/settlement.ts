import { Hono } from "hono";
import { z } from "zod";
import { and, eq, sql, inArray } from "drizzle-orm";
import { db } from "../db";
import {
  projects,
  projectPayments,
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

  const [uninvoicedPayments, unreportedPartnerPayments] = await Promise.all([
    // 세금계산서 미발행: VAT 프로젝트의 수금 건
    db
      .select({
        id: projectPayments.id,
        projectId: projectPayments.projectId,
        projectName: projects.name,
        clientName: clients.companyName,
        paymentType: projectPayments.paymentType,
        amount: projectPayments.amount,
        paidDate: projectPayments.paidDate,
        description: projectPayments.description,
      })
      .from(projectPayments)
      .innerJoin(projects, eq(projectPayments.projectId, projects.id))
      .leftJoin(clients, eq(projects.clientId, clients.id))
      .where(
        and(
          softDeleteFilter(projectPayments.deleted),
          softDeleteFilter(projects.deleted),
          eq(projects.taxType, "vat"),
          eq(projectPayments.invoiceIssued, false),
          sql`EXTRACT(YEAR FROM ${projectPayments.paidDate}::date) = ${year}`,
          sql`EXTRACT(MONTH FROM ${projectPayments.paidDate}::date) = ${month}`
        )
      )
      .orderBy(projectPayments.paidDate),

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
    uninvoicedCount: uninvoicedPayments.length,
    unreportedCount: unreportedPartnerPayments.length,
  };

  return successResponse(c, {
    uninvoicedPayments,
    unreportedPartnerPayments,
    summary,
  });
});

// PATCH /settlement/invoices/batch
app.patch("/invoices/batch", async (c) => {
  const body = await c.req.json();
  const schema = z.object({
    paymentIds: z.array(z.string().uuid()).min(1),
    invoiceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  });

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(c, ERRORS.VALIDATION, 400);
  }

  const { paymentIds, invoiceDate } = parsed.data;

  await db
    .update(projectPayments)
    .set({
      invoiceIssued: true,
      invoiceDate,
      updatedAt: new Date(),
    })
    .where(inArray(projectPayments.id, paymentIds));

  return successResponse(c, { updated: paymentIds.length });
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
