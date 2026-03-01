import { Hono } from "hono";
import { and, count, desc, eq } from "drizzle-orm";
import { db } from "../db";
import { schedules } from "../db/schema";
import { requireAuth } from "../middleware/auth";
import { scheduleWriteSchema } from "@work-manager/schemas";
import { parsePagination, calcOffset } from "../lib/pagination";
import { successResponse, errorResponse, ERRORS } from "../lib/errors";
import { searchFilter, softDeleteFilter, softDeletePayload } from "../lib/query-helpers";
import type { AppVariables } from "../lib/types";

const app = new Hono<{ Variables: AppVariables }>();
app.use("*", requireAuth);

// --- 반복 일정 확장 유틸 ---

interface CalendarSchedule {
  id: string;
  title: string;
  description: string | null;
  startDate: string;
  endDate: string | null;
  startTime: string | null;
  endTime: string | null;
  color: string;
  location: string | null;
  clientId: string | null;
  clientName?: string;
  projectId: string | null;
  projectName?: string;
  recurrenceType: string;
  sourceId?: string;
  isOccurrence?: boolean;
}

type ScheduleRow = typeof schedules.$inferSelect & {
  client: { companyName: string } | null;
  project: { name: string } | null;
};

function toCalendarSchedule(row: ScheduleRow): CalendarSchedule {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    startDate: row.startDate,
    endDate: row.endDate ?? null,
    startTime: row.startTime ?? null,
    endTime: row.endTime ?? null,
    color: row.color,
    location: row.location ?? null,
    clientId: row.clientId ?? null,
    clientName: row.client?.companyName,
    projectId: row.projectId ?? null,
    projectName: row.project?.name,
    recurrenceType: row.recurrenceType,
  };
}

function formatDate(d: Date): string {
  // toISOString()은 UTC 기준이라 로컬 타임존에서 날짜가 틀릴 수 있음 → 로컬 컴포넌트 사용
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function addWeeks(d: Date, n: number): Date {
  return addDays(d, n * 7);
}

function addMonths(d: Date, n: number): Date {
  const r = new Date(d);
  const dayOfMonth = r.getDate();
  r.setMonth(r.getMonth() + n);
  // 월말 오버플로우 보정: 원래 날짜가 넘어간 경우 해당 월의 마지막 날로 클램핑
  if (r.getDate() < dayOfMonth) {
    r.setDate(0);
  }
  return r;
}

function generateOccurrences(
  row: ScheduleRow,
  monthStart: Date,
  monthEnd: Date
): CalendarSchedule[] {
  const occurrences: CalendarSchedule[] = [];
  const baseDate = new Date(row.startDate + "T00:00:00");
  const recurrenceEnd = row.recurrenceEndDate
    ? new Date(row.recurrenceEndDate + "T00:00:00")
    : monthEnd;
  const effectiveEnd = recurrenceEnd < monthEnd ? recurrenceEnd : monthEnd;

  const advanceFn =
    row.recurrenceType === "daily"
      ? (d: Date, n: number) => addDays(d, n)
      : row.recurrenceType === "weekly"
        ? (d: Date, n: number) => addWeeks(d, n)
        : (d: Date, n: number) => addMonths(d, n);

  let step = 0;
  while (step < 366) {
    const current = advanceFn(baseDate, step);
    if (current > effectiveEnd) break;

    if (current >= monthStart && current <= monthEnd) {
      occurrences.push({
        id: `${row.id}_${formatDate(current).replace(/-/g, "")}`,
        title: row.title,
        description: row.description,
        startDate: formatDate(current),
        endDate: null,
        startTime: row.startTime ?? null,
        endTime: row.endTime ?? null,
        color: row.color,
        location: row.location ?? null,
        clientId: row.clientId ?? null,
        clientName: row.client?.companyName,
        projectId: row.projectId ?? null,
        projectName: row.project?.name,
        recurrenceType: row.recurrenceType,
        sourceId: row.id,
        isOccurrence: true,
      });
    }
    step++;
  }

  return occurrences;
}

// --- 라우트 ---

// GET /schedules/month — 월별 조회 (반복 일정 확장), /?year=2024&month=1
app.get("/month", async (c) => {
  const year = parseInt(c.req.query("year") ?? "");
  const month = parseInt(c.req.query("month") ?? "");

  if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
    return errorResponse(c, ERRORS.VALIDATION, 400, "year, month 파라미터가 필요합니다.");
  }

  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0); // 해당 월의 마지막 날
  const rangeStart = formatDate(monthStart);
  const rangeEnd = formatDate(monthEnd);

  // 단발 일정: start_date <= monthEnd AND (end_date >= monthStart OR start_date >= monthStart)
  const singleSchedules = await db.query.schedules.findMany({
    where: and(
      softDeleteFilter(schedules.deleted),
      eq(schedules.recurrenceType, "none")
    ),
    with: { client: true, project: true },
    orderBy: [desc(schedules.startDate)],
  });

  // 범위 필터 (drizzle에서 복합 OR 조건 처리가 복잡하여 JS에서 필터)
  const filteredSingles = singleSchedules.filter((s) => {
    if (s.startDate > rangeEnd) return false;
    if (s.endDate) return s.endDate >= rangeStart;
    return s.startDate >= rangeStart;
  });

  // 반복 일정: start_date <= monthEnd
  const recurringSchedules = await db.query.schedules.findMany({
    where: and(softDeleteFilter(schedules.deleted)),
    with: { client: true, project: true },
  });

  const filtered = recurringSchedules.filter(
    (s) => s.recurrenceType !== "none" && s.startDate <= rangeEnd
  );

  const singles = filteredSingles.map((s) => toCalendarSchedule(s as ScheduleRow));
  const recurrences = filtered.flatMap((s) =>
    generateOccurrences(s as ScheduleRow, monthStart, monthEnd)
  );

  return successResponse(c, { items: [...singles, ...recurrences] });
});

// GET /schedules — 목록
app.get("/", async (c) => {
  const { page, pageSize, search } = parsePagination(c.req.query());
  const offset = calcOffset(page, pageSize);

  const where = and(
    softDeleteFilter(schedules.deleted),
    search ? searchFilter([schedules.title], search) : undefined
  );

  const [items, [{ total }]] = await Promise.all([
    db.select().from(schedules).where(where).orderBy(desc(schedules.startDate)).limit(pageSize).offset(offset),
    db.select({ total: count() }).from(schedules).where(where),
  ]);

  return successResponse(c, { items, total, page, pageSize });
});

// GET /schedules/:id — 상세
app.get("/:id", async (c) => {
  const id = c.req.param("id");
  const schedule = await db.query.schedules.findFirst({
    where: and(eq(schedules.id, id), softDeleteFilter(schedules.deleted)),
    with: { client: true, project: true },
  });

  if (!schedule) return errorResponse(c, ERRORS.NOT_FOUND, 404);
  return successResponse(c, schedule);
});

// POST /schedules — 생성
app.post("/", async (c) => {
  const user = c.get("user");
  const parsed = scheduleWriteSchema.safeParse(await c.req.json());
  if (!parsed.success) return errorResponse(c, ERRORS.VALIDATION, 400);

  const [created] = await db
    .insert(schedules)
    .values({ ...parsed.data, author: user.id })
    .returning();

  return successResponse(c, created, 201);
});

// PATCH /schedules/:id — 수정
app.patch("/:id", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const parsed = scheduleWriteSchema.partial().safeParse(await c.req.json());
  if (!parsed.success) return errorResponse(c, ERRORS.VALIDATION, 400);

  const [updated] = await db
    .update(schedules)
    .set({ ...parsed.data, updatedBy: user.id, updatedAt: new Date() })
    .where(and(eq(schedules.id, id), softDeleteFilter(schedules.deleted)))
    .returning();

  if (!updated) return errorResponse(c, ERRORS.NOT_FOUND, 404);
  return successResponse(c, updated);
});

// DELETE /schedules/:id — 소프트 삭제
app.delete("/:id", async (c) => {
  const id = c.req.param("id");
  const [deleted] = await db
    .update(schedules)
    .set(softDeletePayload())
    .where(and(eq(schedules.id, id), softDeleteFilter(schedules.deleted)))
    .returning();

  if (!deleted) return errorResponse(c, ERRORS.NOT_FOUND, 404);
  return successResponse(c, { id });
});

export default app;
