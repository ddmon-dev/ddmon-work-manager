import { dirname, join } from "path";
import { fileURLToPath } from "url";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { db } from "./db";
import { user } from "./db/schema";
import { seedDemo } from "./db/seed-demo";

// 배포 환경 부트스트랩: 마이그레이션 적용 후, 빈 DB면 데모 시드 실행.
// 실행 위치(cwd)와 무관하게 동작하도록 마이그레이션 폴더는 파일 기준으로 해석한다.
// dist/bootstrap.js 기준 ../drizzle/migrations = apps/server/drizzle/migrations

const migrationsFolder = join(
  dirname(fileURLToPath(import.meta.url)),
  "../drizzle/migrations"
);

const migrationClient = postgres(process.env.DATABASE_URL!, { max: 1 });
await migrate(drizzle(migrationClient), { migrationsFolder });
await migrationClient.end();
console.log("[Bootstrap] 마이그레이션 적용 완료");

const existing = await db.select({ id: user.id }).from(user).limit(1);
if (existing.length === 0) {
  console.log("[Bootstrap] 빈 DB 감지, 데모 시드 실행");
  await seedDemo();
} else {
  console.log("[Bootstrap] 기존 데이터 존재, 시드 생략");
}

process.exit(0);
