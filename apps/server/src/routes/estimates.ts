import { Hono } from "hono";
import { z } from "zod";
import { and, asc, count, countDistinct, desc, eq, ilike, inArray, isNotNull, or, sql } from "drizzle-orm";
import { db } from "../db";
import { clients, estimateSeries, estimates, estimateItemGroups, estimateItems, projects, businessInfo } from "../db/schema";
import { requireAuth } from "../middleware/auth";
import { estimateWriteSchema, type EstimateGroupWriteInput } from "@packages/schemas";
import { calculateTotal } from "@packages/utils";
import { parsePagination, calcOffset } from "../lib/pagination";
import { successResponse, errorResponse, ERRORS } from "../lib/errors";
import { generateEstimateNumber } from "../lib/number-generator";
import { softDeleteFilter, softDeletePayload } from "../lib/query-helpers";
import type { AppVariables } from "../lib/types";

const app = new Hono<{ Variables: AppVariables }>();
app.use("*", requireAuth);

// --- 헬퍼 ---

type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function insertGroupsAndItems(tx: DbTransaction, estimateId: string, groups: EstimateGroupWriteInput[]) {
  for (const group of groups) {
    const [insertedGroup] = await tx
      .insert(estimateItemGroups)
      .values({ estimateId, name: group.name, sortOrder: group.sortOrder })
      .returning();

    if (group.items.length > 0) {
      await tx.insert(estimateItems).values(
        group.items.map((item) => ({
          groupId: insertedGroup.id,
          name: item.name,
          quantity: String(item.quantity),
          unit: item.unit ?? "",
          amount: String(item.amount),
          sortOrder: item.sortOrder,
        }))
      );
    }
  }
}

// GET /estimates — 목록 (계열별 대표 버전, DISTINCT ON)
app.get("/", async (c) => {
  const { page, pageSize, search } = parsePagination(c.req.query());
  const offset = calcOffset(page, pageSize);

  const status = c.req.query("status");

  const searchFilter = search
    ? or(
        ilike(estimates.estimateNumber, `%${search}%`),
        ilike(estimates.title, `%${search}%`),
        ilike(clients.companyName, `%${search}%`)
      )
    : undefined;

  const statusCondition = status ? eq(estimateSeries.status, status) : undefined;

  const whereCondition = and(softDeleteFilter(estimates.deleted), searchFilter, statusCondition);

  // DISTINCT ON 서브쿼리: finalEstimateId 우선, 없으면 최신 version
  const sq = db
    .selectDistinctOn([estimates.estimateNumber], {
      id: estimates.id,
      estimateNumber: estimates.estimateNumber,
      title: estimates.title,
      description: estimates.description,
      issuedDate: estimates.issuedDate,
      taxType: estimates.taxType,
      totalAmount: estimates.totalAmount,
      discountAmount: estimates.discountAmount,
      showTaxAmount: estimates.showTaxAmount,
      version: estimates.version,
      versionLabel: estimates.versionLabel,
      createdAt: estimates.createdAt,
      updatedAt: estimates.updatedAt,
      clientId: estimates.clientId,
      clientCompanyName: clients.companyName,
      seriesStatus: estimateSeries.status,
      finalEstimateId: estimateSeries.finalEstimateId,
    })
    .from(estimates)
    .innerJoin(clients, eq(estimates.clientId, clients.id))
    .innerJoin(estimateSeries, eq(estimates.estimateNumber, estimateSeries.estimateNumber))
    .where(whereCondition)
    .orderBy(
      estimates.estimateNumber,
      sql`CASE WHEN ${estimates.id} = ${estimateSeries.finalEstimateId} THEN 0 ELSE 1 END`,
      desc(estimates.version)
    )
    .as("series_reps");

  const [items, [{ total }]] = await Promise.all([
    db.select().from(sq).orderBy(desc(sq.estimateNumber)).limit(pageSize).offset(offset),
    db
      .select({ total: countDistinct(estimates.estimateNumber) })
      .from(estimates)
      .innerJoin(clients, eq(estimates.clientId, clients.id))
      .innerJoin(estimateSeries, eq(estimates.estimateNumber, estimateSeries.estimateNumber))
      .where(whereCondition),
  ]);

  return successResponse(c, { items, total, page, pageSize });
});

// 계열 라우트 — /:id 전에 등록

// GET /estimates/series/:estimateNumber/versions — 버전 목록
app.get("/series/:estimateNumber/versions", async (c) => {
  const estimateNumber = c.req.param("estimateNumber");

  const [series, versions] = await Promise.all([
    db.query.estimateSeries.findFirst({
      where: eq(estimateSeries.estimateNumber, estimateNumber),
    }),
    db.query.estimates.findMany({
      where: and(
        eq(estimates.estimateNumber, estimateNumber),
        softDeleteFilter(estimates.deleted)
      ),
      orderBy: [asc(estimates.version)],
    }),
  ]);

  const result = versions.map((v) => ({
    id: v.id,
    version: v.version,
    versionLabel: v.versionLabel,
    issuedDate: v.issuedDate,
    isFinal: v.id === series?.finalEstimateId,
  }));

  return successResponse(c, result);
});

// PATCH /estimates/series/:estimateNumber/status — 계열 상태 변경
app.patch("/series/:estimateNumber/status", async (c) => {
  const estimateNumber = c.req.param("estimateNumber");
  const parsed = z.object({
    status: z.enum(["pending", "contracted", "expired"]),
    // contracted 상태로 변경 시 CHECK 제약 충족을 위해 함께 전달
    finalEstimateId: z.string().uuid().optional(),
  }).safeParse(await c.req.json());
  if (!parsed.success) return errorResponse(c, ERRORS.VALIDATION, 400);

  const { status, finalEstimateId } = parsed.data;

  // contracted 상태로 변경 시 finalEstimateId 필수
  if (status === "contracted" && !finalEstimateId) {
    return errorResponse(c, ERRORS.VALIDATION, 400, "계약 상태로 변경 시 최종 버전을 선택해야 합니다.");
  }

  // contracted → 다른 상태로 변경 시, 연결된 프로젝트가 있으면 차단
  if (status !== "contracted") {
    const currentSeries = await db.query.estimateSeries.findFirst({
      where: eq(estimateSeries.estimateNumber, estimateNumber),
    });
    if (currentSeries?.status === "contracted") {
      const linkedProject = await db.query.projects.findFirst({
        where: and(
          eq(projects.estimateNumber, estimateNumber),
          softDeleteFilter(projects.deleted)
        ),
        columns: { id: true },
      });
      if (linkedProject) {
        return errorResponse(
          c,
          ERRORS.VALIDATION,
          400,
          "연결된 프로젝트가 있어 계약 상태를 변경할 수 없습니다."
        );
      }
    }
  }

  // status와 finalEstimateId를 단일 UPDATE로 처리 (CHECK 제약: contracted ↔ finalEstimateId NOT NULL)
  const [updated] = await db
    .update(estimateSeries)
    .set({
      status,
      finalEstimateId: status === "contracted" ? (finalEstimateId ?? null) : null,
      updatedAt: new Date(),
    })
    .where(eq(estimateSeries.estimateNumber, estimateNumber))
    .returning();

  if (!updated) return errorResponse(c, ERRORS.NOT_FOUND, 404);
  return successResponse(c, updated);
});

// PATCH /estimates/series/:estimateNumber/final — 최종 버전 지정
app.patch("/series/:estimateNumber/final", async (c) => {
  const estimateNumber = c.req.param("estimateNumber");
  const parsed = z.object({
    finalEstimateId: z.string().uuid().nullable(),
  }).safeParse(await c.req.json());
  if (!parsed.success) return errorResponse(c, ERRORS.VALIDATION, 400);

  const [updated] = await db
    .update(estimateSeries)
    .set({ finalEstimateId: parsed.data.finalEstimateId, updatedAt: new Date() })
    .where(eq(estimateSeries.estimateNumber, estimateNumber))
    .returning();

  if (!updated) return errorResponse(c, ERRORS.NOT_FOUND, 404);
  return successResponse(c, updated);
});

// DELETE /estimates/:id — 개별 버전 소프트 삭제
app.delete("/:id", async (c) => {
  const id = c.req.param("id");

  const target = await db.query.estimates.findFirst({
    where: and(eq(estimates.id, id), softDeleteFilter(estimates.deleted)),
    columns: { id: true, estimateNumber: true },
  });
  if (!target) return errorResponse(c, ERRORS.NOT_FOUND, 404);

  const series = await db.query.estimateSeries.findFirst({
    where: eq(estimateSeries.estimateNumber, target.estimateNumber),
  });

  if (series?.finalEstimateId === id) {
    return errorResponse(c, ERRORS.VALIDATION, 400, "계약 버전은 삭제할 수 없습니다. 먼저 계약 지정을 해제해주세요.");
  }

  const [{ total }] = await db
    .select({ total: count() })
    .from(estimates)
    .where(and(eq(estimates.estimateNumber, target.estimateNumber), softDeleteFilter(estimates.deleted)));

  if (total <= 1) {
    return errorResponse(c, ERRORS.VALIDATION, 400, "마지막 남은 버전은 삭제할 수 없습니다. 견적서 전체 삭제를 이용해주세요.");
  }

  await db.update(estimates).set(softDeletePayload()).where(eq(estimates.id, id));

  return successResponse(c, { id });
});

// DELETE /estimates/series/:estimateNumber — 계열 전체 소프트 삭제
app.delete("/series/:estimateNumber", async (c) => {
  const estimateNumber = c.req.param("estimateNumber");

  const linkedProject = await db.query.projects.findFirst({
    where: and(
      eq(projects.estimateNumber, estimateNumber),
      softDeleteFilter(projects.deleted)
    ),
    columns: { id: true },
  });
  if (linkedProject) {
    return errorResponse(c, ERRORS.VALIDATION, 400, "연결된 프로젝트가 있어 삭제할 수 없습니다.");
  }

  await db
    .update(estimates)
    .set(softDeletePayload())
    .where(eq(estimates.estimateNumber, estimateNumber));

  return successResponse(c, { estimateNumber });
});

// GET /estimates/series/:estimateNumber/project-info — 프로젝트 생성 자동 채움용
app.get("/series/:estimateNumber/project-info", async (c) => {
  const estimateNumber = c.req.param("estimateNumber");

  const series = await db.query.estimateSeries.findFirst({
    where: eq(estimateSeries.estimateNumber, estimateNumber),
  });
  if (!series) return errorResponse(c, ERRORS.NOT_FOUND, 404);

  // 최종 버전 우선, 없으면 최신 버전
  const targetId = series.finalEstimateId;
  const estimate = targetId
    ? await db.query.estimates.findFirst({
        where: and(eq(estimates.id, targetId), softDeleteFilter(estimates.deleted)),
        columns: { clientId: true, title: true, description: true, totalAmount: true, taxType: true },
      })
    : await db.query.estimates.findFirst({
        where: and(
          eq(estimates.estimateNumber, estimateNumber),
          softDeleteFilter(estimates.deleted)
        ),
        orderBy: [desc(estimates.version)],
        columns: { clientId: true, title: true, description: true, totalAmount: true, taxType: true },
      });

  if (!estimate) return errorResponse(c, ERRORS.NOT_FOUND, 404);

  const totalAmount = Number(estimate.totalAmount ?? 0);
  const taxType = estimate.taxType;
  // supplyAmount: 견적서 totalAmount(공급가액 + VAT)에서 공급가액 역산
  const supplyAmount = taxType === "vat"
    ? Math.round(totalAmount / 1.1)
    : totalAmount;

  return successResponse(c, {
    clientId: estimate.clientId,
    title: estimate.title,
    description: estimate.description ?? null,
    totalAmount: estimate.totalAmount,
    taxType,
    supplyAmount,
  });
});

// GET /estimates/available?clientId=&currentEstimateNumber= — 프로젝트 연결 가능 견적서 목록
app.get("/available", async (c) => {
  const { clientId, currentEstimateNumber } = c.req.query();
  if (!clientId) return errorResponse(c, ERRORS.VALIDATION, 400, "clientId가 필요합니다.");

  // contracted + finalEstimateId IS NOT NULL 계열 조회
  const contractedSeries = await db.query.estimateSeries.findMany({
    where: and(
      eq(estimateSeries.status, "contracted"),
      isNotNull(estimateSeries.finalEstimateId)
    ),
    columns: { estimateNumber: true, finalEstimateId: true },
  });

  if (contractedSeries.length === 0) return successResponse(c, []);

  const finalEstimateIds = contractedSeries.map(s => s.finalEstimateId as string);

  // clientId 매칭 + deleted=false 견적서 조회
  const matchingEstimates = await db.query.estimates.findMany({
    where: and(
      inArray(estimates.id, finalEstimateIds),
      eq(estimates.clientId, clientId),
      softDeleteFilter(estimates.deleted)
    ),
    columns: { estimateNumber: true, title: true, description: true, totalAmount: true, taxType: true },
  });

  if (matchingEstimates.length === 0) return successResponse(c, []);

  // 이미 프로젝트에 연결된 견적서 번호 조회 (currentEstimateNumber는 제외 대상에서 제외)
  const linkedProjects = await db.query.projects.findMany({
    where: and(softDeleteFilter(projects.deleted), isNotNull(projects.estimateNumber)),
    columns: { estimateNumber: true },
  });

  const linkedNumbers = new Set(
    linkedProjects
      .map(p => p.estimateNumber)
      .filter(en => en !== null && en !== currentEstimateNumber)
  );

  const result = matchingEstimates
    .filter(e => !linkedNumbers.has(e.estimateNumber))
    .map(e => {
      const totalAmount = Number(e.totalAmount ?? 0);
      const supplyAmount = e.taxType === "vat"
        ? Math.round(totalAmount / 1.1)
        : totalAmount;
      return { ...e, supplyAmount };
    });
  return successResponse(c, result);
});

// GET /estimates/:id — 상세 (groups/items/versions 포함)
app.get("/:id", async (c) => {
  const id = c.req.param("id");

  const estimate = await db.query.estimates.findFirst({
    where: and(eq(estimates.id, id), softDeleteFilter(estimates.deleted)),
    with: {
      client: true,
      groups: {
        orderBy: [asc(estimateItemGroups.sortOrder)],
        with: {
          items: { orderBy: [asc(estimateItems.sortOrder)] },
        },
      },
    },
  });

  if (!estimate) return errorResponse(c, ERRORS.NOT_FOUND, 404);

  // 동일 계열의 버전 목록
  const versions = await db.query.estimates.findMany({
    where: and(
      eq(estimates.estimateNumber, estimate.estimateNumber),
      softDeleteFilter(estimates.deleted)
    ),
    columns: { id: true, version: true, versionLabel: true, createdAt: true },
    orderBy: [asc(estimates.version)],
  });

  // 계열 정보
  const series = await db.query.estimateSeries.findFirst({
    where: eq(estimateSeries.estimateNumber, estimate.estimateNumber),
  });

  // 연결된 프로젝트
  const linkedProject = await db.query.projects.findFirst({
    where: and(
      eq(projects.estimateNumber, estimate.estimateNumber),
      softDeleteFilter(projects.deleted)
    ),
    columns: { id: true, projectNumber: true, name: true },
  });

  return successResponse(c, { ...estimate, versions, series, linkedProject: linkedProject ?? null });
});

// POST /estimates — 생성 (트랜잭션)
app.post("/", async (c) => {
  const user = c.get("user");
  const raw = await c.req.json();

  // estimateNumber는 기존 계열에 개정본 추가 시 전달 (optional, 별도 파싱)
  const existingNumber: string | undefined =
    typeof raw?.estimateNumber === "string" ? raw.estimateNumber : undefined;

  const parsed = estimateWriteSchema.safeParse(raw);
  if (!parsed.success) return errorResponse(c, ERRORS.VALIDATION, 400);

  const { groups, discountValue = 0, ...estimateData } = parsed.data;

  const calcGroups = groups.map((g: EstimateGroupWriteInput) => ({
    items: g.items.map((item) => ({ amount: Number(item.amount) })),
  }));
  const totals = calculateTotal(
    calcGroups,
    estimateData.taxType,
    estimateData.discountType,
    discountValue
  );

  // 발행 시점 스냅샷: 사업자 정보 + 발행자 개인 정보
  const [bizInfo] = await db.select().from(businessInfo).limit(1);
  const publisherInfo = {
    bizName: bizInfo?.name ?? undefined,
    ceo: bizInfo?.ceo ?? undefined,
    bizNumber: bizInfo?.bizNumber ?? undefined,
    address: bizInfo?.address ?? undefined,
    issuer: user.name ?? undefined,
    phone: user.phone ?? undefined,
    email: user.email ?? undefined,
  };

  const created = await db.transaction(async (tx) => {
    let estimateNumber: string;
    let version: number;

    if (existingNumber) {
      // 기존 계열에 개정본 추가
      estimateNumber = existingNumber;
      const latest = await tx.query.estimates.findFirst({
        where: and(
          eq(estimates.estimateNumber, estimateNumber),
          softDeleteFilter(estimates.deleted)
        ),
        orderBy: [desc(estimates.version)],
      });
      version = (latest?.version ?? 0) + 1;
    } else {
      // 신규 계열 생성
      estimateNumber = await generateEstimateNumber(tx);
      version = 1;
      await tx.insert(estimateSeries).values({ estimateNumber });
    }

    const [estimate] = await tx
      .insert(estimates)
      .values({
        clientId: estimateData.clientId,
        estimateNumber,
        title: estimateData.title,
        description: estimateData.description,
        issuedDate: estimateData.issuedDate ?? null,
        validUntil: estimateData.validUntil ?? null,
        taxType: estimateData.taxType,
        discountType: estimateData.discountType,
        discountValue: String(discountValue),
        notes: estimateData.notes,
        memo: estimateData.memo,
        showTaxAmount: estimateData.showTaxAmount,
        versionLabel: estimateData.versionLabel,
        version,
        totalAmount: String(totals.total),
        discountAmount: String(totals.discountAmount),
        author: user.id,
        publisherInfo,
      })
      .returning();

    await insertGroupsAndItems(tx, estimate.id, groups);

    return estimate;
  });

  return successResponse(c, created, 201);
});

// PATCH /estimates/:id — 수정 (트랜잭션: groups 전체 교체)
app.patch("/:id", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const parsed = estimateWriteSchema.partial().safeParse(await c.req.json());
  if (!parsed.success) return errorResponse(c, ERRORS.VALIDATION, 400);

  const existing = await db.query.estimates.findFirst({
    where: and(eq(estimates.id, id), softDeleteFilter(estimates.deleted)),
    with: { groups: { with: { items: true } } },
  });
  if (!existing) return errorResponse(c, ERRORS.NOT_FOUND, 404);

  const { groups, discountValue, ...estimateData } = parsed.data;

  // 금액 재계산 (groups가 있을 때만)
  let totalAmount = existing.totalAmount;
  let discountAmount = existing.discountAmount;
  const finalDiscountValue = discountValue ?? Number(existing.discountValue ?? 0);

  if (groups) {
    const calcGroups = (groups as EstimateGroupWriteInput[]).map((g) => ({
      items: g.items.map((item) => ({ amount: Number(item.amount) })),
    }));
    const totals = calculateTotal(
      calcGroups,
      estimateData.taxType ?? existing.taxType,
      estimateData.discountType ?? existing.discountType,
      finalDiscountValue
    );
    totalAmount = String(totals.total);
    discountAmount = String(totals.discountAmount);
  }

  // 수정 시점 스냅샷 갱신
  const [bizInfo] = await db.select().from(businessInfo).limit(1);
  const publisherInfo = {
    bizName: bizInfo?.name ?? undefined,
    ceo: bizInfo?.ceo ?? undefined,
    bizNumber: bizInfo?.bizNumber ?? undefined,
    address: bizInfo?.address ?? undefined,
    issuer: user.name ?? undefined,
    phone: user.phone ?? undefined,
    email: user.email ?? undefined,
  };

  const updated = await db.transaction(async (tx) => {
    const [estimate] = await tx
      .update(estimates)
      .set({
        ...estimateData,
        ...(discountValue !== undefined && { discountValue: String(discountValue) }),
        totalAmount,
        discountAmount,
        publisherInfo,
        updatedBy: user.id,
        updatedAt: new Date(),
      })
      .where(and(eq(estimates.id, id), softDeleteFilter(estimates.deleted)))
      .returning();

    if (groups) {
      // 기존 groups 삭제 (cascade로 items도 삭제됨)
      await tx.delete(estimateItemGroups).where(eq(estimateItemGroups.estimateId, id));
      await insertGroupsAndItems(tx, id, groups as EstimateGroupWriteInput[]);
    }

    return estimate;
  });

  return successResponse(c, updated);
});

export default app;
