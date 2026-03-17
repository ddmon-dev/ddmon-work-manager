import { Hono } from "hono";
import { z } from "zod";
import { and, eq, sql } from "drizzle-orm";
import { db } from "../db";
import { projects, projectPayments, clients } from "../db/schema";
import { requireAuth } from "../middleware/auth";
import { successResponse, errorResponse, ERRORS } from "../lib/errors";
import { softDeleteFilter } from "../lib/query-helpers";
import type { AppVariables } from "../lib/types";

const MONTH_LABELS = [
  "1월", "2월", "3월", "4월", "5월", "6월",
  "7월", "8월", "9월", "10월", "11월", "12월",
];

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
          softDeleteFilter(projects.deleted),
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
      .where(softDeleteFilter(projectPayments.deleted)),
  ]);

  const validProjectIds = new Set(allProjects.map((p) => p.id));

  // 연도별 버킷
  type YearBucket = {
    supplyTotal: number;
    paymentTotal: number;
    vatTotal: number;
    vatCollected: number;
  };
  const emptyBucket = (): YearBucket => ({
    supplyTotal: 0,
    paymentTotal: 0,
    vatTotal: 0,
    vatCollected: 0,
  });
  const yearBuckets = new Map<number, YearBucket>();
  yearBuckets.set(prevYear, emptyBucket());
  yearBuckets.set(currentYear, emptyBucket());

  // 전체 공급가액 + VAT (누적 미수금/미정산 계산용)
  let allSupplyTotal = 0;
  let allVatTotal = 0;

  // 프로젝트 → 공급가액 캐시 / 프로젝트 → 계약연도 매핑
  const projectSupplyMap = new Map<string, number>();
  const projectContractYearMap = new Map<string, number>();

  for (const p of allProjects) {
    const amount = Number(p.contractAmount ?? 0);
    if (amount === 0) continue;

    projectSupplyMap.set(p.id, amount);
    allSupplyTotal += amount;

    const vatAmount = p.taxType === "vat" ? Math.round(amount * 0.1) : 0;
    allVatTotal += vatAmount;

    const contractYear = new Date(p.contractDate).getFullYear();
    projectContractYearMap.set(p.id, contractYear);
    const bucket = yearBuckets.get(contractYear);
    if (bucket) {
      bucket.supplyTotal += amount;
      bucket.vatTotal += vatAmount;
    }
  }

  // 수금 집계
  let allPaymentTotal = 0;
  const paidByProjectId = new Map<string, number>();

  // 월별 데이터 (chartYear 기준)
  const monthlySupply = new Array(12).fill(0);
  const monthlyPayment = new Array(12).fill(0);

  // 프로젝트별 월별 매출액(공급가액)
  for (const p of allProjects) {
    if (!projectSupplyMap.has(p.id)) continue;

    const contractDate = new Date(p.contractDate);
    if (contractDate.getFullYear() === chartYear) {
      monthlySupply[contractDate.getMonth()] += Number(p.contractAmount ?? 0);
    }
  }

  for (const pay of allPayments) {
    if (!validProjectIds.has(pay.projectId)) continue;
    const amount = Number(pay.amount);
    allPaymentTotal += amount;

    const current = paidByProjectId.get(pay.projectId) ?? 0;
    paidByProjectId.set(pay.projectId, current + amount);

    // 수금은 프로젝트 계약연도 기준으로 집계
    const contractYear = projectContractYearMap.get(pay.projectId);
    if (contractYear !== undefined) {
      const bucket = yearBuckets.get(contractYear);
      if (bucket) {
        bucket.paymentTotal += amount;
      }
    }

    const paidDate = new Date(pay.paidDate);
    if (paidDate.getFullYear() === chartYear) {
      monthlyPayment[paidDate.getMonth()] += amount;
    }
  }

  // 부가세 정산 계산 (순차충당 방식: 공급가액 초과분이 VAT 정산)
  let allVatCollected = 0;

  for (const p of allProjects) {
    if (p.taxType !== "vat") continue;
    const contractAmount = Number(p.contractAmount ?? 0);
    if (contractAmount === 0) continue;

    const totalPaid = paidByProjectId.get(p.id) ?? 0;
    const vatCollected = Math.max(0, totalPaid - contractAmount);
    allVatCollected += vatCollected;

    const contractYear = new Date(p.contractDate).getFullYear();
    const bucket = yearBuckets.get(contractYear);
    if (bucket) {
      bucket.vatCollected += vatCollected;
    }
  }

  // 연도별 요약
  function toYearlySummary(year: number) {
    const bucket = yearBuckets.get(year)!;
    const outstanding = bucket.supplyTotal - bucket.paymentTotal;
    const collectionRate =
      bucket.supplyTotal > 0
        ? Math.round((bucket.paymentTotal / bucket.supplyTotal) * 1000) / 10
        : 0;
    const vatOutstanding = bucket.vatTotal - bucket.vatCollected;
    return {
      year,
      supplyTotal: bucket.supplyTotal,
      paymentTotal: bucket.paymentTotal,
      outstanding,
      collectionRate,
      vatTotal: bucket.vatTotal,
      vatCollected: bucket.vatCollected,
      vatOutstanding,
    };
  }

  // 월별 데이터
  const monthlyData = MONTH_LABELS.map((label, i) => ({
    month: label,
    supply: monthlySupply[i],
    payment: monthlyPayment[i],
  }));

  // 누적 미수금 / 누적 미정산 부가세
  const cumulativeOutstanding = allSupplyTotal - allPaymentTotal;
  const cumulativeVatOutstanding = allVatTotal - allVatCollected;

  // 미수금 프로젝트 목록
  const outstandingProjects = allProjects
    .map((p) => {
      const contractAmount = projectSupplyMap.get(p.id);
      if (!contractAmount) return null;

      const paidAmount = paidByProjectId.get(p.id) ?? 0;
      const outstanding = contractAmount - paidAmount;
      if (outstanding <= 0) return null;

      return {
        id: p.id,
        name: p.name,
        clientName: p.clientName ?? "",
        taxType: p.taxType,
        contractAmount,
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
    cumulativeVatOutstanding,
    monthlyData,
    outstandingProjects,
  });
});

export default app;
