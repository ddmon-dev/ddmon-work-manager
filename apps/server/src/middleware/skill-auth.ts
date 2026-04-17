import { createMiddleware } from "hono/factory";
import { getConnInfo } from "@hono/node-server/conninfo";
import { eq } from "drizzle-orm";
import { auth } from "../auth";
import { db } from "../db";
import { user as userTable } from "../db/schema";
import type { AppVariables, AuthUser } from "../lib/types";

const LOCAL_ADDRS = new Set(["127.0.0.1", "::1", "::ffff:127.0.0.1"]);

export const requireAuthOrSkill = createMiddleware<{ Variables: AppVariables }>(async (c, next) => {
  const providedKey = c.req.header("X-Skill-Key");

  if (providedKey) {
    const expectedKey = process.env.WORK_MANAGER_PLUGIN_KEY;
    if (!expectedKey) {
      return c.json({ error: "Unauthorized", message: "Skill auth not configured" }, 401);
    }

    const remote = getConnInfo(c).remote?.address;
    if (!remote || !LOCAL_ADDRS.has(remote)) {
      return c.json({ error: "Unauthorized", message: "Skill requests must originate from localhost" }, 401);
    }

    if (providedKey !== expectedKey) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const [admin] = await db
      .select()
      .from(userTable)
      .where(eq(userTable.superAdmin, true))
      .limit(1);

    if (!admin) {
      return c.json({ error: "ServerError", message: "No super admin user available for skill context" }, 500);
    }

    c.set("user", admin as unknown as AuthUser);
    c.set("skillCaller", true);
    await next();
    return;
  }

  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  c.set("user", session.user);
  c.set("session", session.session);
  await next();
});
