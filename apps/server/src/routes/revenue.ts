import { Hono } from "hono";
import { z } from "zod";
import { and, eq, sql } from "drizzle-orm";
import { db } from "../db";
import { projects, projectPayments, clients } from "../db/schema";
import { requireAuth } from "../middleware/auth";
import { successResponse, errorResponse, ERRORS } from "../lib/errors";
import type { AppVariables } from "../lib/types";

const MONTH_LABELS = [
  "1월", "2월", "3월", "4월", "5월", "6월",
  "7월", "8월", "9월", "10월", "11월", "12월",
];

function getNetReceivable(amount: number, taxType: string | null): number {
  if (taxType === "withholding") return amount - Math.round(amount * 0.033);
  if (taxType === "vat") return amount + Math.round(amount * 0.1);
  return amount;
}

const app = new Hono<{ Variables: AppVariables }>();
app.use("*", requireAuth);

// GET /revenue?year=YYYY
app.get("/", async (c) => {
  const yearParam = c.req.query("year");
  const parsed = z.coerce.number().int().min(2000).max(2100).safeParse(yearParam);
  const chartYear = parsed.success ? parsed.data : new Date().getFullYear();

  const currentYear = new Date().getFullYear();
  const prevYear = currentYear - 1;

  // 1. 프로젝트 + 수금 병렬 조회
  const [allProjects, allPayments] = await Promise.all([
    db
      .select({
        id: projects.id,
        name: projects.name,
        status: projects.status,
        contractDate: projects.contractDate,
        contractAmount: projects.contractAmount,
        taxType: projects.taxType,
        clientId: projects.clientId,
        clientName: clients.companyName,
      })
      .from(projects)
      .leftJoin(clients, eq(projects.clientId, clients.id))
      .where(
        and(
          eq(projects.deleted, false),
          sql`${projects.status} != 'discarded'`
        )
      ),
    db
      .select({
        projectId: projectPayments.projectId,
        amount: projectPayments.amount,
        paidDate: projectPayments.paidDate,
      })
      .from(projectPayments)
      .where(eq(projectPayments.deleted, false)),
  ]);

  const validProjectIds = new Set(allProjects.map((p) => p.id));

  // 연도별 버킷
  type YearBucket = { contractTotal: number; netReceivableTotal: number; paymentTotal: number };
  const yearBuckets = new Map<number, YearBucket>();
  yearBuckets.set(prevYear, { contractTotal: 0, netReceivableTotal: 0, paymentTotal: 0 });
  yearBuckets.set(currentYear, { contractTotal: 0, netReceivableTotal: 0, paymentTotal: 0 });

  // 전체 실수령액 (누적 미수금 계산용)
  let allNetReceivableTotal = 0;

  // 프로젝트 → 실수령액 캐시
  const projectNetMap = new Map<string, number>();

  for (const p of allProjects) {
    const amount = Number(p.contractAmount ?? 0);
    if (amount === 0) continue;

    const netReceivable = getNetReceivable(amount, p.taxType);
    projectNetMap.set(p.id, netReceivable);
    allNetReceivableTotal += netReceivable;

    const contractYear = new Date(p.contractDate).getFullYear();
    const bucket = yearBuckets.get(contractYear);
    if (bucket) {
      bucket.contractTotal += netReceivable;
      bucket.netReceivableTotal += netReceivable;
    }
  }

  // 수금 집계
  let allPaymentTotal = 0;
  const paidByProjectId = new Map<string, number>();

  // 월별 데이터 (chartYear 기준)
  const monthlyContract = new Array(12).fill(0);
  const monthlyPayment = new Array(12).fill(0);

  // 프로젝트별 월별 계약액
  for (const p of allProjects) {
    const netReceivable = projectNetMap.get(p.id);
    if (!netReceivable) continue;

    const contractDate = new Date(p.contractDate);
    if (contractDate.getFullYear() === chartYear) {
      monthlyContract[contractDate.getMonth()] += netReceivable;
    }
  }

  for (const pay of allPayments) {
    if (!validProjectIds.has(pay.projectId)) continue;
    const amount = Number(pay.amount);
    allPaymentTotal += amount;

    // 프로젝트별 수금 합계
    const current = paidByProjectId.get(pay.projectId) ?? 0;
    paidByProjectId.set(pay.projectId, current + amount);

    // 연도별 수금
    const paidYear = new Date(pay.paidDate).getFullYear();
    const bucket = yearBuckets.get(paidYear);
    if (bucket) {
      bucket.paymentTotal += amount;
    }

    // 월별 수금
    const paidDate = new Date(pay.paidDate);
    if (paidDate.getFullYear() === chartYear) {
      monthlyPayment[paidDate.getMonth()] += amount;
    }
  }

  // 연도별 요약
  function toYearlySummary(year: number) {
    const bucket = yearBuckets.get(year)!;
    const outstanding = bucket.netReceivableTotal - bucket.paymentTotal;
    const collectionRate =
      bucket.netReceivableTotal > 0
        ? Math.round((bucket.paymentTotal / bucket.netReceivableTotal) * 1000) / 10
        : 0;
    return { year, ...bucket, outstanding, collectionRate };
  }

  // 월별 데이터
  const monthlyData = MONTH_LABELS.map((label, i) => ({
    month: label,
    contract: monthlyContract[i],
    payment: monthlyPayment[i],
  }));

  // 누적 미수금
  const cumulativeOutstanding = allNetReceivableTotal - allPaymentTotal;

  // 미수금 프로젝트 목록
  const outstandingProjects = allProjects
    .map((p) => {
      const netReceivable = projectNetMap.get(p.id);
      if (!netReceivable) return null;

      const paidAmount = paidByProjectId.get(p.id) ?? 0;
      const outstanding = netReceivable - paidAmount;
      if (outstanding <= 0) return null;

      return {
        id: p.id,
        name: p.name,
        clientName: p.clientName ?? "",
        netReceivableAmount: netReceivable,
        paidAmount,
        outstanding,
        status: p.status,
      };
    })
    .filter(Boolean)
    .sort((a, b) => b!.outstanding - a!.outstanding);

  return successResponse(c, {
    prevYearSummary: toYearlySummary(prevYear),
    currentYearSummary: toYearlySummary(currentYear),
    cumulativeOutstanding,
    monthlyData,
    outstandingProjects,
  });
});

export default app;
