import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { cors } from "hono/cors";
import { auth } from "./auth";
import apiRoutes from "./routes";
import type { AppVariables } from "./lib/types";
import { ERRORS, errorResponse } from "./lib/errors";
import { ensureStorageDir } from "./lib/storage";

const app = new Hono<{ Variables: AppVariables }>();

const isServeStatic = process.env.SERVE_STATIC === "true";

if (!isServeStatic) {
  app.use(
    "*",
    cors({
      origin: process.env.CLIENT_URL ?? "http://localhost:5173",
      credentials: true,
    })
  );
}

app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw));

app.route("/api", apiRoutes);

if (isServeStatic) {
  const staticDir = process.env.STATIC_DIR ?? "../../apps/client/dist";

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
serve({ fetch: app.fetch, port }, async (info) => {
  console.log(`Server running at http://localhost:${info.port}`);
  if (isServeStatic) {
    console.log(`Serving static files from: ${process.env.STATIC_DIR}`);
  }
  try {
    await ensureStorageDir();
  } catch (err) {
    console.warn("[Storage] 디렉토리 초기화 실패:", (err as Error).message);
  }
});

export default app;
