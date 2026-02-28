import { Hono } from "hono";
import { z } from "zod";
import { and, count, desc, asc, eq, or, ilike } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import { db } from "../db";
import { user, account } from "../db/schema";
import { requireAuth } from "../middleware/auth";
import { hashPassword } from "better-auth/crypto";
import { parsePagination, calcOffset } from "../lib/pagination";
import { successResponse, errorResponse, ERRORS } from "../lib/errors";
import type { AppVariables } from "../lib/types";

const app = new Hono<{ Variables: AppVariables }>();
app.use("*", requireAuth);

// GET /admins - 목록 (페이지네이션, 검색, 정렬)
app.get("/", async (c) => {
  const query = c.req.query() as Record<string, string>;
  const { page, pageSize, search } = parsePagination(query);
  const sort = query.sort || "createdAt";
  const order = query.order || "desc";
  const offset = calcOffset(page, pageSize);

  const conditions: (SQL | undefined)[] = [eq(user.deleted, false)];

  if (search) {
    conditions.push(
      or(
        ilike(user.name, `%${search}%`),
        ilike(user.email, `%${search}%`),
        ilike(user.username, `%${search}%`)
      )
    );
  }

  const where = and(...conditions);

  const sortColumn =
    sort === "name"
      ? user.name
      : sort === "email"
        ? user.email
        : sort === "username"
          ? user.username
          : user.createdAt;
  const orderBy = order === "asc" ? asc(sortColumn) : desc(sortColumn);

  const [items, [{ total }]] = await Promise.all([
    db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        username: user.username,
        superAdmin: user.superAdmin,
        phone: user.phone,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      })
      .from(user)
      .where(where)
      .orderBy(orderBy)
      .limit(pageSize)
      .offset(offset),
    db.select({ total: count() }).from(user).where(where),
  ]);

  return successResponse(c, { items, total, page, pageSize });
});

// GET /admins/:id - 단일 조회
app.get("/:id", async (c) => {
  const id = c.req.param("id");

  const [item] = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      username: user.username,
      superAdmin: user.superAdmin,
      phone: user.phone,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    })
    .from(user)
    .where(and(eq(user.id, id), eq(user.deleted, false)));

  if (!item) return errorResponse(c, ERRORS.NOT_FOUND, 404);
  return successResponse(c, item);
});

// POST /admins - 사용자 생성
app.post("/", async (c) => {
  const body = await c.req.json();
  const parsed = z
    .object({
      name: z.string().min(1),
      email: z.string().email(),
      username: z.string().min(1),
      password: z.string().min(6),
      phone: z.string().optional(),
      superAdmin: z.boolean().default(false),
    })
    .safeParse(body);

  if (!parsed.success) return errorResponse(c, ERRORS.VALIDATION, 400);

  // superAdmin 중복 체크
  if (parsed.data.superAdmin) {
    const [existing] = await db
      .select({ id: user.id })
      .from(user)
      .where(and(eq(user.superAdmin, true), eq(user.deleted, false)))
      .limit(1);
    if (existing) {
      return errorResponse(
        c,
        { code: "CREATE_FAILED", message: "최고 관리자는 하나만 존재할 수 있습니다." },
        400
      );
    }
  }

  const { password, ...userData } = parsed.data;
  const hashedPassword = await hashPassword(password);
  const userId = crypto.randomUUID();

  try {
    const [created] = await db
      .insert(user)
      .values({
        id: userId,
        ...userData,
        displayUsername: userData.username,
        emailVerified: false,
      })
      .returning({
        id: user.id,
        name: user.name,
        email: user.email,
        username: user.username,
        superAdmin: user.superAdmin,
        phone: user.phone,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      });

    // account 테이블에 credential 레코드 생성 (Better Auth 호환)
    await db.insert(account).values({
      id: crypto.randomUUID(),
      accountId: userId,
      providerId: "credential",
      userId,
      password: hashedPassword,
    });

    return successResponse(c, created, 201);
  } catch (error: unknown) {
    const message =
      error instanceof Error && error.message.includes("unique")
        ? "이미 사용 중인 이메일 또는 사용자명입니다."
        : undefined;
    return errorResponse(c, ERRORS.CREATE_FAILED, 400, message);
  }
});

// PATCH /admins/:id - 수정
app.patch("/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  const parsed = z
    .object({
      name: z.string().min(1).optional(),
      email: z.string().email().optional(),
      phone: z.string().optional(),
      superAdmin: z.boolean().optional(),
      password: z.string().min(6).optional(),
    })
    .safeParse(body);

  if (!parsed.success) return errorResponse(c, ERRORS.VALIDATION, 400);

  // superAdmin으로 변경 시 중복 체크 (본인 제외)
  if (parsed.data.superAdmin === true) {
    const [existing] = await db
      .select({ id: user.id })
      .from(user)
      .where(and(eq(user.superAdmin, true), eq(user.deleted, false)))
      .limit(1);
    if (existing && existing.id !== id) {
      return errorResponse(
        c,
        { code: "UPDATE_FAILED", message: "최고 관리자는 하나만 존재할 수 있습니다." },
        400
      );
    }
  }

  const { password, ...updateData } = parsed.data;

  try {
    const [updated] = await db
      .update(user)
      .set({ ...updateData, updatedAt: new Date() })
      .where(and(eq(user.id, id), eq(user.deleted, false)))
      .returning({
        id: user.id,
        name: user.name,
        email: user.email,
        username: user.username,
        superAdmin: user.superAdmin,
        phone: user.phone,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      });

    if (!updated) return errorResponse(c, ERRORS.NOT_FOUND, 404);

    // 비밀번호 변경 요청이 있으면 account 테이블 업데이트
    if (password) {
      const hashedPassword = await hashPassword(password);
      await db
        .update(account)
        .set({ password: hashedPassword, updatedAt: new Date() })
        .where(
          and(eq(account.userId, id), eq(account.providerId, "credential"))
        );
    }

    return successResponse(c, updated);
  } catch (error: unknown) {
    const message =
      error instanceof Error && error.message.includes("unique")
        ? "이미 사용 중인 이메일입니다."
        : undefined;
    return errorResponse(c, ERRORS.UPDATE_FAILED, 400, message);
  }
});

// DELETE /admins/:id - 소프트 삭제
app.delete("/:id", async (c) => {
  const id = c.req.param("id");

  // superAdmin은 삭제 불가
  const [target] = await db
    .select({ superAdmin: user.superAdmin })
    .from(user)
    .where(and(eq(user.id, id), eq(user.deleted, false)));

  if (!target) return errorResponse(c, ERRORS.NOT_FOUND, 404);
  if (target.superAdmin) {
    return errorResponse(
      c,
      { code: "DELETE_FAILED", message: "최고 관리자는 삭제할 수 없습니다." },
      400
    );
  }

  const [deleted] = await db
    .update(user)
    .set({ deleted: true, updatedAt: new Date() })
    .where(and(eq(user.id, id), eq(user.deleted, false)))
    .returning();

  if (!deleted) return errorResponse(c, ERRORS.NOT_FOUND, 404);
  return successResponse(c, { id });
});

export default app;
