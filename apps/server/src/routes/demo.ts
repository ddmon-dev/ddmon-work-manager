import { Hono } from "hono";
import { auth } from "../auth";
import { errorResponse } from "../lib/errors";

const app = new Hono();

// POST /login — 서버 env의 데모 계정으로 로그인 대행 (자격증명은 클라이언트에 노출하지 않는다)
app.post("/login", async (c) => {
  const username = process.env.DEMO_USERNAME;
  const password = process.env.DEMO_PASSWORD;

  if (!username || !password) {
    return errorResponse(
      c,
      { code: "DEMO_NOT_CONFIGURED", message: "데모 계정이 설정되지 않았습니다." },
      500
    );
  }

  return auth.api.signInUsername({
    body: { username, password },
    headers: c.req.raw.headers,
    asResponse: true,
  });
});

export default app;
