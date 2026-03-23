-- 데이터 보전: clientId가 있고 customerName이 없는 레코드 처리
UPDATE "client_environments"
SET "customer_name" = (SELECT "company_name" FROM "clients" WHERE "id" = "client_environments"."client_id")
WHERE "customer_name" IS NULL AND "client_id" IS NOT NULL;
--> statement-breakpoint
UPDATE "client_environments" SET "customer_name" = '' WHERE "customer_name" IS NULL;
--> statement-breakpoint
ALTER TABLE "client_environments" DROP CONSTRAINT "client_environments_client_id_clients_id_fk";
--> statement-breakpoint
ALTER TABLE "client_environments" ALTER COLUMN "customer_name" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "client_environments" DROP COLUMN "client_id";
