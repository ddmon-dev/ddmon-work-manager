import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { cors } from "hono/cors";
import { auth } from "./auth";
import apiRoutes from "./routes";
import type { AppVariables } from "./lib/types";
import { ERRORS, errorResponse } from "./lib/errors";

const app = new Hono<{ Variables: AppVariables }>();

app.use(
  "*",
  cors({
    origin: process.env.CLIENT_URL ?? "http://localhost:5173",
    credentials: true,
  })
);

app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw));

app.get("/", (c) => {
  return c.json({ message: "Work Manager API" });
});

app.route("/api", apiRoutes);

app.onError((err, c) => {
  console.error("[Unhandled Error]", err);
  return errorResponse(c, ERRORS.UNEXPECTED, 500, err.message);
});

const port = Number(process.env.PORT) || 3001;
serve({ fetch: app.fetch, port }, (info) => {
  console.log(`Server running at http://localhost:${info.port}`);
});

export default app;
