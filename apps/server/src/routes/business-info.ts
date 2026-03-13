import { Hono } from "hono";
import { z } from "zod";
import { db } from "../db";
import { businessInfo } from "../db/schema";
import { requireAuth } from "../middleware/auth";
import { successResponse, errorResponse, ERRORS } from "../lib/errors";
import type { AppVariables } from "../lib/types";

const app = new Hono<{ Variables: AppVariables }>();
app.use("*", requireAuth);

const businessInfoWriteSchema = z.object({
  name: z.string().optional(),
  ceo: z.string().optional(),
  bizNumber: z.string().optional(),
  address: z.string().optional(),
  bankName: z.string().optional(),
  bankAccount: z.string().optional(),
  accountHolder: z.string().optional(),
  bizType: z.string().optional(),
  bizItem: z.string().optional(),
});

// GET /business-info — 사업자 정보 조회 (단일 행 싱글턴)
app.get("/", async (c) => {
  const [row] = await db.select().from(businessInfo).limit(1);
  return successResponse(c, row ?? null);
});

// PUT /business-info — 사업자 정보 upsert
app.put("/", async (c) => {
  const parsed = businessInfoWriteSchema.safeParse(await c.req.json());
  if (!parsed.success) return errorResponse(c, ERRORS.VALIDATION, 400);

  const existing = await db.select().from(businessInfo).limit(1);

  if (existing.length === 0) {
    const [created] = await db.insert(businessInfo).values(parsed.data).returning();
    return successResponse(c, created);
  }

  const [updated] = await db
    .update(businessInfo)
    .set({ ...parsed.data, updatedAt: new Date() })
    .returning();
  return successResponse(c, updated);
});

export default app;
