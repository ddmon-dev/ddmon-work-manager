import { Hono } from "hono";
import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "../db";
import { projectSchedules, projects, clients } from "../db/schema";
import { requireAuth } from "../middleware/auth";
import { z } from "zod";
import { projectScheduleWriteSchema, projectScheduleSplitSchema } from "@packages/schemas";
import { successResponse, errorResponse, ERRORS } from "../lib/errors";
import type { AppVariables } from "../lib/types";

const app = new Hono<{ Variables: AppVariables }>();
app.use("*", requireAuth);

// GET /project-schedules/overview — 멀티 프로젝트 오버뷰
app.get("/overview", async (c) => {
  const status = c.req.query("status") ?? "active";

  const statusFilter =
    status === "completed"
      ? eq(projects.status, "completed")
      : inArray(projects.status, ["pending", "active", "settling"]);

  const projectList = await db
    .select({
      id: projects.id,
      name: projects.name,
      status: projects.status,
      contractDate: projects.contractDate,
      deliveredDate: projects.deliveredDate,
      completedDate: projects.completedDate,
      companyName: clients.companyName,
      sortOrder: projects.sortOrder,
    })
    .from(projects)
    .innerJoin(clients, eq(projects.clientId, clients.id))
    .where(and(statusFilter, eq(projects.deleted, false)))
    .orderBy(asc(projects.sortOrder));

  const projectIds = projectList.map((p) => p.id);

  let scheduleRows: (typeof projectSchedules.$inferSelect)[] = [];
  if (projectIds.length > 0) {
    scheduleRows = await db
      .select()
      .from(projectSchedules)
      .where(inArray(projectSchedules.projectId, projectIds))
      .orderBy(asc(projectSchedules.sortOrder), asc(projectSchedules.createdAt));
  }

  const scheduleMap = new Map<string, (typeof projectSchedules.$inferSelect)[]>();
  for (const s of scheduleRows) {
    const list = scheduleMap.get(s.projectId) ?? [];
    list.push(s);
    scheduleMap.set(s.projectId, list);
  }

  const items = projectList.map((p) => ({
    ...p,
    schedules: scheduleMap.get(p.id) ?? [],
  }));

  return successResponse(c, { items });
});

// PUT /project-schedules/reorder — 순서 일괄 변경
const reorderSchema = z.object({
  items: z.array(z.object({ id: z.string().uuid(), sortOrder: z.number().int() })),
});

app.put("/reorder", async (c) => {
  const parsed = reorderSchema.safeParse(await c.req.json());
  if (!parsed.success) return errorResponse(c, ERRORS.VALIDATION, 400);

  const user = c.get("user");
  await Promise.all(
    parsed.data.items.map(({ id, sortOrder }) =>
      db.update(projectSchedules)
        .set({ sortOrder, updatedBy: user.id, updatedAt: new Date() })
        .where(eq(projectSchedules.id, id))
    )
  );

  return successResponse(c, { updated: parsed.data.items.length });
});

// GET /project-schedules — 목록 (projectId 필터)
app.get("/", async (c) => {
  const projectId = c.req.query("projectId");

  const where = projectId
    ? eq(projectSchedules.projectId, projectId)
    : undefined;

  const items = await db
    .select()
    .from(projectSchedules)
    .where(where)
    .orderBy(asc(projectSchedules.sortOrder), asc(projectSchedules.createdAt));

  return successResponse(c, { items });
});

// GET /project-schedules/:id — 상세
app.get("/:id", async (c) => {
  const id = c.req.param("id");
  const item = await db.query.projectSchedules.findFirst({
    where: eq(projectSchedules.id, id),
    with: { project: true },
  });

  if (!item) return errorResponse(c, ERRORS.NOT_FOUND, 404);
  return successResponse(c, item);
});

// POST /project-schedules — 생성
app.post("/", async (c) => {
  const user = c.get("user");
  const parsed = projectScheduleWriteSchema.safeParse(await c.req.json());
  if (!parsed.success) return errorResponse(c, ERRORS.VALIDATION, 400);

  const [created] = await db
    .insert(projectSchedules)
    .values({ ...parsed.data, author: user.id })
    .returning();

  return successResponse(c, created, 201);
});

// PATCH /project-schedules/:id — 수정
app.patch("/:id", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const parsed = projectScheduleWriteSchema.partial().safeParse(await c.req.json());
  if (!parsed.success) return errorResponse(c, ERRORS.VALIDATION, 400);

  const [updated] = await db
    .update(projectSchedules)
    .set({ ...parsed.data, updatedBy: user.id, updatedAt: new Date() })
    .where(eq(projectSchedules.id, id))
    .returning();

  if (!updated) return errorResponse(c, ERRORS.NOT_FOUND, 404);
  return successResponse(c, updated);
});

// POST /project-schedules/:id/split — 일정 분할
app.post("/:id/split", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const parsed = projectScheduleSplitSchema.safeParse(await c.req.json());
  if (!parsed.success) return errorResponse(c, ERRORS.VALIDATION, 400);

  const original = await db.query.projectSchedules.findFirst({
    where: eq(projectSchedules.id, id),
  });
  if (!original) return errorResponse(c, ERRORS.NOT_FOUND, 404);
  if (!original.endDate)
    return errorResponse(c, ERRORS.VALIDATION, 400, "종료일이 없는 일정은 분할할 수 없습니다.");

  const { splitDate } = parsed.data;
  if (splitDate <= original.startDate || splitDate > original.endDate)
    return errorResponse(c, ERRORS.VALIDATION, 400, "분할 지점은 시작일과 종료일 사이여야 합니다.");

  // 같은 group에 속하도록 groupId 결정
  const groupId = original.groupId ?? crypto.randomUUID();

  // splitDate 기준: 앞쪽 ~splitDate 전날, 뒤쪽 splitDate~ 원본 endDate
  const prevDay = new Date(splitDate);
  prevDay.setDate(prevDay.getDate() - 1);
  const newEndDate = prevDay.toISOString().slice(0, 10);

  // 트랜잭션: 원본 endDate 수정 + 새 일정 생성
  const result = await db.transaction(async (tx) => {
    const [updated] = await tx
      .update(projectSchedules)
      .set({
        endDate: newEndDate,
        groupId,
        updatedBy: user.id,
        updatedAt: new Date(),
      })
      .where(eq(projectSchedules.id, id))
      .returning();

    // 새 일정 생성 (splitDate부터 원본 endDate까지)
    const [created] = await tx
      .insert(projectSchedules)
      .values({
        projectId: original.projectId,
        groupId,
        category: original.category,
        title: original.title,
        description: original.description,
        startDate: splitDate,
        endDate: original.endDate,
        sortOrder: original.sortOrder + 1,
        author: user.id,
      })
      .returning();

    return { updated, created };
  });

  return successResponse(c, result, 201);
});

// POST /project-schedules/:id/merge — 같은 그룹 일정 2개 병합
const mergeSchema = z.object({ targetId: z.string().uuid() });

app.post("/:id/merge", async (c) => {
  const user = c.get("user");
  const sourceId = c.req.param("id");
  const parsed = mergeSchema.safeParse(await c.req.json());
  if (!parsed.success) return errorResponse(c, ERRORS.VALIDATION, 400);
  const { targetId } = parsed.data;

  const [source, target] = await Promise.all([
    db.query.projectSchedules.findFirst({ where: eq(projectSchedules.id, sourceId) }),
    db.query.projectSchedules.findFirst({ where: eq(projectSchedules.id, targetId) }),
  ]);
  if (!source || !target) return errorResponse(c, ERRORS.NOT_FOUND, 404);
  if (!source.groupId || source.groupId !== target.groupId)
    return errorResponse(c, ERRORS.VALIDATION, 400, "같은 그룹의 일정만 병합할 수 있습니다.");

  const startDate = source.startDate < target.startDate ? source.startDate : target.startDate;
  const sourceEnd = source.endDate ?? source.startDate;
  const targetEnd = target.endDate ?? target.startDate;
  const endDate = sourceEnd > targetEnd ? sourceEnd : targetEnd;

  // 병합 후 그룹에 남는 일정 수 확인 (source 삭제 후)
  const groupMembers = await db
    .select()
    .from(projectSchedules)
    .where(eq(projectSchedules.groupId, source.groupId));
  const newGroupId = groupMembers.length - 1 <= 1 ? null : target.groupId;

  const result = await db.transaction(async (tx) => {
    const [updated] = await tx
      .update(projectSchedules)
      .set({ startDate, endDate, groupId: newGroupId, updatedBy: user.id, updatedAt: new Date() })
      .where(eq(projectSchedules.id, targetId))
      .returning();

    await tx.delete(projectSchedules).where(eq(projectSchedules.id, sourceId));

    return updated;
  });

  return successResponse(c, result);
});

// DELETE /project-schedules/:id — 하드 삭제
app.delete("/:id", async (c) => {
  const id = c.req.param("id");
  const [deleted] = await db
    .delete(projectSchedules)
    .where(eq(projectSchedules.id, id))
    .returning();

  if (!deleted) return errorResponse(c, ERRORS.NOT_FOUND, 404);
  return successResponse(c, { id });
});

export default app;
