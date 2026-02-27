import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { cors } from "hono/cors";
import { auth } from "./auth";
import { requireAuth } from "./middleware/auth";

const app = new Hono();

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

app.get("/api/protected", requireAuth, (c) => {
  const user = c.get("user");
  return c.json({ user });
});

serve({ fetch: app.fetch, port: 3001 }, (info) => {
  console.log(`Server running at http://localhost:${info.port}`);
});

export default app;
