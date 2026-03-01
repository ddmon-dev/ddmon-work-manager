import { Hono } from "hono";
import { and, eq, gte, lte, or, sql, count } from "drizzle-orm";
import { db } from "../db";
import {
  estimateSeries,
  projects,
  projectPayments,
  schedules,
  clients,
} from "../db/schema";
import { requireAuth } from "../middleware/auth";
import { successResponse } from "../lib/errors";
import type { AppVariables } from "../lib/types";

const app = new Hono<{ Variables: AppVariables }>();
app.use("*", requireAuth);

// GET /dashboard/stats
app.get("/stats", async (c) => {
  const [pendingEstimate, pendingProject, activeProject, settlingProject] =
    await Promise.all([
      db
        .select({ total: count() })
        .from(estimateSeries)
        .where(eq(estimateSeries.status, "pending")),
      db
        .select({ total: count() })
        .from(projects)
        .where(
          and(eq(projects.deleted, false), eq(projects.status, "pending"))
        ),
      db
        .select({ total: count() })
        .from(projects)
        .where(
          and(eq(projects.deleted, false), eq(projects.status, "active"))
        ),
      db
        .select({ total: count() })
        .from(projects)
        .where(
          and(eq(projects.deleted, false), eq(projects.status, "settling"))
        ),
    ]);

  return successResponse(c, {
    pendingEstimateCount: pendingEstimate[0].total,
    pendingProjectCount: pendingProject[0].total,
    activeProjectCount: activeProject[0].total,
    settlingProjectCount: settlingProject[0].total,
  });
});

// GET /dashboard/revenue-summary
app.get("/revenue-summary", async (c) => {
  const currentYear = new Date().getFullYear();
  const yearStart = `${currentYear}-01-01`;
  const yearEnd = `${currentYear}-12-31`;

  // 올해 계약 프로젝트 + 전체 프로젝트 (미수금 계산용)
  const allProjects = await db
    .select({
      id: projects.id,
      contractAmount: projects.contractAmount,
      taxType: projects.taxType,
      contractDate: projects.contractDate,
    })
    .from(projects)
    .where(
      and(
        eq(projects.deleted, false),
        sql`${projects.status} != 'discarded'`
      )
    );

  // 전체 수금
  const allPayments = await db
    .select({
      projectId: projectPayments.projectId,
      amount: projectPayments.amount,
      paidDate: projectPayments.paidDate,
    })
    .from(projectPayments)
    .where(eq(projectPayments.deleted, false));

  const validProjectIds = new Set(allProjects.map((p) => p.id));

  // 계약액 계산 (실수령액 기준)
  let contractTotal = 0;
  let allNetReceivableTotal = 0;

  for (const p of allProjects) {
    const amount = Number(p.contractAmount ?? 0);
    if (amount === 0) continue;

    // withholding: 계약액 - 3.3%, vat: 계약액 + 10%, 그 외: 계약액 그대로
    const netReceivable =
      p.taxType === "withholding"
        ? amount - Math.round(amount * 0.033)
        : p.taxType === "vat"
          ? amount + Math.round(amount * 0.1)
          : amount;

    allNetReceivableTotal += netReceivable;

    const contractYear = new Date(p.contractDate).getFullYear();
    if (contractYear === currentYear) {
      contractTotal += netReceivable;
    }
  }

  // 수금액 집계
  let paymentTotal = 0;
  let allPaymentTotal = 0;

  for (const pay of allPayments) {
    if (!validProjectIds.has(pay.projectId)) continue;
    const amount = Number(pay.amount);
    allPaymentTotal += amount;

    const paidYear = new Date(pay.paidDate).getFullYear();
    if (paidYear === currentYear) {
      paymentTotal += amount;
    }
  }

  const collectionRate =
    contractTotal > 0
      ? Math.round((paymentTotal / contractTotal) * 1000) / 10
      : 0;

  const cumulativeOutstanding = allNetReceivableTotal - allPaymentTotal;

  return successResponse(c, {
    currentYear,
    contractTotal,
    paymentTotal,
    collectionRate,
    cumulativeOutstanding,
  });
});

// GET /dashboard/schedules
app.get("/schedules", async (c) => {
  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];

  // 이번 주 끝 (일요일)
  const day = now.getDay();
  const daysUntilSunday = day === 0 ? 0 : 7 - day;
  const endOfWeek = new Date(now);
  endOfWeek.setDate(endOfWeek.getDate() + daysUntilSunday);
  const endOfWeekStr = endOfWeek.toISOString().split("T")[0];

  // 30일 후
  const monthLater = new Date(now);
  monthLater.setDate(monthLater.getDate() + 30);
  const monthLaterStr = monthLater.toISOString().split("T")[0];

  const rows = await db
    .select({
      id: schedules.id,
      title: schedules.title,
      startDate: schedules.startDate,
      endDate: schedules.endDate,
      startTime: schedules.startTime,
      endTime: schedules.endTime,
      color: schedules.color,
      clientName: clients.companyName,
      projectName: projects.name,
    })
    .from(schedules)
    .leftJoin(clients, eq(schedules.clientId, clients.id))
    .leftJoin(projects, eq(schedules.projectId, projects.id))
    .where(
      and(
        eq(schedules.deleted, false),
        or(
          and(
            gte(schedules.startDate, todayStr),
            lte(schedules.startDate, monthLaterStr)
          ),
          and(
            sql`${schedules.startDate} < ${todayStr}`,
            gte(schedules.endDate, todayStr)
          )
        )
      )
    )
    .orderBy(schedules.startDate, schedules.startTime);

  const today: typeof rows = [];
  const thisWeek: typeof rows = [];
  const upcoming: typeof rows = [];

  for (const row of rows) {
    const isToday =
      row.startDate === todayStr ||
      (row.startDate < todayStr &&
        row.endDate != null &&
        row.endDate >= todayStr);

    if (isToday) {
      today.push(row);
    } else if (
      row.startDate > todayStr &&
      row.startDate <= endOfWeekStr
    ) {
      thisWeek.push(row);
    } else if (row.startDate > endOfWeekStr) {
      upcoming.push(row);
    }
  }

  return successResponse(c, { today, thisWeek, upcoming });
});

export default app;
