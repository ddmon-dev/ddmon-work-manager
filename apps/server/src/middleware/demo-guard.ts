import { createMiddleware } from "hono/factory";
import type { Context } from "hono";
import { DEMO_MESSAGES } from "@packages/types";

export const IS_DEMO = process.env.DEMO_MODE === "true";

const BATCH_DELETE_PATTERN = /\/batch(-permanent)?-delete$/;
const ADMIN_ITEM_PATTERN = /^\/api\/admins\/[^/]+$/;

function blocked(c: Context, message: string) {
  return c.json({ success: false, error: "DEMO_BLOCKED", message }, 400);
}

/**
 * 데모 가드: 생성·수정은 허용하고 삭제·비밀번호 변경만 차단한다.
 * 401/403은 클라이언트가 페이지 리다이렉트로 처리하므로 400으로 응답해 toast로 흐르게 한다.
 */
export const demoGuard = createMiddleware(async (c, next) => {
  const method = c.req.method;
  const path = c.req.path;

  if (method === "DELETE" || (method === "POST" && BATCH_DELETE_PATTERN.test(path))) {
    return blocked(c, DEMO_MESSAGES.DELETE_BLOCKED);
  }

  if (method === "POST" && path === "/api/auth/change-password") {
    return blocked(c, DEMO_MESSAGES.PASSWORD_BLOCKED);
  }

  if (method === "PATCH" && ADMIN_ITEM_PATTERN.test(path)) {
    const body = await c.req.json().catch(() => null);
    if (body && typeof body === "object" && "password" in body && body.password) {
      return blocked(c, DEMO_MESSAGES.PASSWORD_BLOCKED);
    }
  }

  await next();
});
