import { Hono } from "hono";
import { and, eq, gte, lte, or, sql, count } from "drizzle-orm";
import { db } from "../db";
import {
  estimateSeries,
  projects,
  projectPayments,
  schedules,
} from "../db/schema";
import { requireAuth } from "../middleware/auth";
import { successResponse } from "../lib/errors";
import { softDeleteFilter } from "../lib/query-helpers";
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
          and(softDeleteFilter(projects.deleted), eq(projects.status, "pending"))
        ),
      db
        .select({ total: count() })
        .from(projects)
        .where(
          and(softDeleteFilter(projects.deleted), eq(projects.status, "active"))
        ),
      db
        .select({ total: count() })
        .from(projects)
        .where(
          and(softDeleteFilter(projects.deleted), eq(projects.status, "settling"))
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
        softDeleteFilter(projects.deleted),
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
    .where(softDeleteFilter(projectPayments.deleted));

  const validProjectIds = new Set(allProjects.map((p) => p.id));

  // 계약액(공급가액) 계산
  let contractTotal = 0;
  let allContractTotal = 0;
  const projectContractYearMap = new Map<string, number>();

  for (const p of allProjects) {
    const amount = Number(p.contractAmount ?? 0);
    if (amount === 0) continue;

    allContractTotal += amount;

    const contractYear = new Date(p.contractDate).getFullYear();
    projectContractYearMap.set(p.id, contractYear);

    if (contractYear === currentYear) {
      contractTotal += amount;
    }
  }

  // 수금액 집계 (프로젝트 계약연도 기준)
  let paymentTotal = 0;
  let allPaymentTotal = 0;

  for (const pay of allPayments) {
    if (!validProjectIds.has(pay.projectId)) continue;
    const amount = Number(pay.amount);
    allPaymentTotal += amount;

    const contractYear = projectContractYearMap.get(pay.projectId);
    if (contractYear === currentYear) {
      paymentTotal += amount;
    }
  }

  const collectionRate =
    contractTotal > 0
      ? Math.round((paymentTotal / contractTotal) * 1000) / 10
      : 0;

  const cumulativeOutstanding = allContractTotal - allPaymentTotal;

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
    })
    .from(schedules)
    .where(
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
