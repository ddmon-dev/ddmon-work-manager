-- publisher_info가 없는 기존 견적서에 superAdmin 계정 정보로 backfill
UPDATE "estimates"
SET "publisher_info" = jsonb_build_object(
  'issuer', u.name,
  'email', u.email,
  'phone', u.phone
)
FROM "user" u
WHERE u.super_admin = true
  AND "estimates"."publisher_info" IS NULL;
--> statement-breakpoint
ALTER TABLE "estimates" DROP COLUMN "issuer";
