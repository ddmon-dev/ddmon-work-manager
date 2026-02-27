import { sql } from "drizzle-orm";
import { db } from "./index";

async function reset() {
  console.log("Resetting database...");

  await db.execute(sql`DROP SCHEMA public CASCADE`);
  await db.execute(sql`CREATE SCHEMA public`);
  await db.execute(sql`DROP SCHEMA IF EXISTS drizzle CASCADE`);

  console.log("Database reset complete. Run db:migrate then db:seed.");
  process.exit(0);
}

reset().catch((err) => {
  console.error("Reset failed:", err);
  process.exit(1);
});
