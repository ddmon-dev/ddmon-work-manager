import { Hono } from "hono";
import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "../db";
import { projectSchedules, projectScheduleLanes, projects, clients } from "../db/schema";
import { requireAuth } from "../middleware/auth";
import { z } from "zod";
import { projectScheduleWriteSchema, projectScheduleLaneWriteSchema } from "@packages/schemas";
import { successResponse, errorResponse, ERRORS } from "../lib/errors";
import type { AppVariables } from "../lib/types";

const app = new Hono<{ Variables: AppVariables }>();
app.use("*", requireAuth);

// ── 오버뷰 ─────────────────────────────────────────────────

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

  let laneRows: (typeof projectScheduleLanes.$inferSelect)[] = [];
  let scheduleRows: (typeof projectSchedules.$inferSelect)[] = [];
  if (projectIds.length > 0) {
    [laneRows, scheduleRows] = await Promise.all([
      db
        .select()
        .from(projectScheduleLanes)
        .where(inArray(projectScheduleLanes.projectId, projectIds))
        .orderBy(asc(projectScheduleLanes.sortOrder), asc(projectScheduleLanes.createdAt)),
      db
        .select()
        .from(projectSchedules)
        .where(inArray(projectSchedules.projectId, projectIds))
        .orderBy(asc(projectSchedules.sortOrder), asc(projectSchedules.createdAt)),
    ]);
  }

  // 레인별 일정 그룹핑
  const schedulesByLane = new Map<string, (typeof projectSchedules.$inferSelect)[]>();
  for (const s of scheduleRows) {
    const list = schedulesByLane.get(s.laneId) ?? [];
    list.push(s);
    schedulesByLane.set(s.laneId, list);
  }

  // 프로젝트별 레인+일정 그룹핑
  type LaneWithSchedules = typeof projectScheduleLanes.$inferSelect & {
    schedules: (typeof projectSchedules.$inferSelect)[];
  };
  const lanesByProject = new Map<string, LaneWithSchedules[]>();
  for (const lane of laneRows) {
    const list = lanesByProject.get(lane.projectId) ?? [];
    list.push({ ...lane, schedules: schedulesByLane.get(lane.id) ?? [] });
    lanesByProject.set(lane.projectId, list);
  }

  // 레인이 없는 프로젝트에 기본 레인 자동 생성
  const projectsWithoutLanes = projectList.filter((p) => !lanesByProject.has(p.id));
  if (projectsWithoutLanes.length > 0) {
    const newLanes = await db
      .insert(projectScheduleLanes)
      .values(projectsWithoutLanes.map((p) => ({ projectId: p.id, title: "", sortOrder: 0 })))
      .returning();
    for (const lane of newLanes) {
      lanesByProject.set(lane.projectId, [{ ...lane, schedules: [] }]);
    }
  }

  const items = projectList.map((p) => ({
    ...p,
    lanes: lanesByProject.get(p.id) ?? [],
  }));

  return successResponse(c, { items });
});

// ── 레인 CRUD ────────────────────────────────────────────────

// GET /project-schedules/lanes?projectId=
app.get("/lanes", async (c) => {
  const projectId = c.req.query("projectId");
  if (!projectId) return errorResponse(c, ERRORS.VALIDATION, 400, "projectId가 필요합니다.");

  let items = await db
    .select()
    .from(projectScheduleLanes)
    .where(eq(projectScheduleLanes.projectId, projectId))
    .orderBy(asc(projectScheduleLanes.sortOrder), asc(projectScheduleLanes.createdAt));

  // 레인이 없으면 기본 레인 자동 생성
  if (items.length === 0) {
    items = await db
      .insert(projectScheduleLanes)
      .values({ projectId, title: "", sortOrder: 0 })
      .returning();
  }

  return successResponse(c, { items });
});

// POST /project-schedules/lanes
app.post("/lanes", async (c) => {
  const parsed = projectScheduleLaneWriteSchema.safeParse(await c.req.json());
  if (!parsed.success) return errorResponse(c, ERRORS.VALIDATION, 400);

  const [created] = await db
    .insert(projectScheduleLanes)
    .values(parsed.data)
    .returning();

  return successResponse(c, created, 201);
});

// PATCH /project-schedules/lanes/:id
app.patch("/lanes/:id", async (c) => {
  const id = c.req.param("id");
  const parsed = z.object({
    title: z.string().optional(),
    sortOrder: z.number().int().optional(),
  }).safeParse(await c.req.json());
  if (!parsed.success) return errorResponse(c, ERRORS.VALIDATION, 400);

  const [updated] = await db
    .update(projectScheduleLanes)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(projectScheduleLanes.id, id))
    .returning();

  if (!updated) return errorResponse(c, ERRORS.NOT_FOUND, 404);
  return successResponse(c, updated);
});

// DELETE /project-schedules/lanes/:id
app.delete("/lanes/:id", async (c) => {
  const id = c.req.param("id");
  const [deleted] = await db
    .delete(projectScheduleLanes)
    .where(eq(projectScheduleLanes.id, id))
    .returning();

  if (!deleted) return errorResponse(c, ERRORS.NOT_FOUND, 404);
  return successResponse(c, { id });
});

// PUT /project-schedules/lanes/reorder
const laneReorderSchema = z.object({
  items: z.array(z.object({ id: z.string().uuid(), sortOrder: z.number().int() })),
});

app.put("/lanes/reorder", async (c) => {
  const parsed = laneReorderSchema.safeParse(await c.req.json());
  if (!parsed.success) return errorResponse(c, ERRORS.VALIDATION, 400);

  await Promise.all(
    parsed.data.items.map(({ id, sortOrder }) =>
      db.update(projectScheduleLanes)
        .set({ sortOrder, updatedAt: new Date() })
        .where(eq(projectScheduleLanes.id, id))
    )
  );

  return successResponse(c, { updated: parsed.data.items.length });
});

// ── 일정 CRUD ────────────────────────────────────────────────

// PUT /project-schedules/reorder
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

// GET /project-schedules
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

// GET /project-schedules/:id
app.get("/:id", async (c) => {
  const id = c.req.param("id");
  const item = await db.query.projectSchedules.findFirst({
    where: eq(projectSchedules.id, id),
    with: { project: true },
  });

  if (!item) return errorResponse(c, ERRORS.NOT_FOUND, 404);
  return successResponse(c, item);
});

// POST /project-schedules
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

// PATCH /project-schedules/:id
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

// DELETE /project-schedules/:id
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
