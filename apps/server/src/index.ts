import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";
import { auth } from "./auth";
import apiRoutes from "./routes";
import demoRoutes from "./routes/demo";
import { demoGuard, IS_DEMO } from "./middleware/demo-guard";
import type { AppVariables } from "./lib/types";
import { ERRORS, errorResponse } from "./lib/errors";
import { ensureStorageDir } from "./lib/storage";

const app = new Hono<{ Variables: AppVariables }>();

app.use("*", secureHeaders());

const isServeStatic = process.env.SERVE_STATIC === "true";
const staticDir = process.env.STATIC_DIR ?? "../../apps/client/dist";

if (!isServeStatic) {
  app.use(
    "*",
    cors({
      origin: process.env.CLIENT_URL ?? "http://localhost:5173",
      credentials: true,
    })
  );
}

if (IS_DEMO) {
  app.use("/api/*", demoGuard);
  app.route("/api/demo", demoRoutes);
}

app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw));

app.route("/api", apiRoutes);

if (isServeStatic) {
  // Vite 빌드 에셋 (장기 캐시)
  app.use(
    "/assets/*",
    serveStatic({
      root: staticDir,
      onNotFound: (path, c) => {
        console.warn(`[static] not found: ${path}`);
      },
    })
  );

  // 폰트 파일
  app.use(
    "/fonts/*",
    serveStatic({
      root: staticDir,
    })
  );

  // 루트 정적 파일 (SPA fallback보다 먼저 매칭)
  app.use("/favicon.svg", serveStatic({ root: staticDir }));
  app.use("/robots.txt", serveStatic({ root: staticDir }));

  // SPA fallback: API 경로 외 모든 요청 → index.html
  app.use("*", async (c, next) => {
    const path = c.req.path;
    if (path.startsWith("/api/")) {
      return next();
    }
    return serveStatic({ path: "/index.html", root: staticDir })(c, next);
  });
} else {
  app.get("/", (c) => {
    return c.json({ message: "Work Manager API" });
  });
}

app.onError((err, c) => {
  console.error("[Unhandled Error]", err);
  return errorResponse(c, ERRORS.UNEXPECTED, 500);
});

const port = Number(process.env.PORT) || 4001;
const server = serve({ fetch: app.fetch, port }, async (info) => {
  console.log(`Server running at http://localhost:${info.port}`);
  if (isServeStatic) {
    console.log(`Serving static files from: ${staticDir}`);
  }
  try {
    await ensureStorageDir();
  } catch (err) {
    console.warn("[Storage] 디렉토리 초기화 실패:", (err as Error).message);
  }
});

// 종료 신호에 정상 응답하지 않으면 배포 교체 시 강제 종료되어 크러시로 기록됨
const shutdown = () => {
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 5000).unref();
};
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

export default app;
