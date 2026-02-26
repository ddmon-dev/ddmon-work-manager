import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { formatDate } from "@work-manager/utils";
import type { Example } from "@work-manager/types";
import { exampleSchema } from "@work-manager/schemas";

const app = new Hono();

app.get("/", (c) => {
  return c.json({
    message: "Work Manager API",
    date: formatDate(new Date()),
  });
});

app.get("/health", (c) => {
  const example: Example = { id: "1", name: "test" };
  const parsed = exampleSchema.parse(example);
  return c.json({ status: "ok", parsed });
});

serve({ fetch: app.fetch, port: 3001 }, (info) => {
  console.log(`Server running at http://localhost:${info.port}`);
});

export default app;
