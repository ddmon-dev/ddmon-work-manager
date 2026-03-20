-- 1. project_invoices 테이블 생성
CREATE TABLE "project_invoices" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "project_id" uuid NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "payment_type" text NOT NULL DEFAULT 'deposit',
  "description" text NOT NULL DEFAULT '',
  "amount" numeric(15, 2) NOT NULL DEFAULT '0',
  "issue_date" date NOT NULL,
  "paid_date" date,
  "deleted" boolean NOT NULL DEFAULT false,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

-- 2. VAT 프로젝트의 기존 project_payments → project_invoices 마이그레이션
INSERT INTO "project_invoices" (
  "id", "project_id", "payment_type", "description", "amount",
  "issue_date", "paid_date", "deleted", "created_at", "updated_at"
)
SELECT
  pp."id", pp."project_id", pp."payment_type", pp."description", pp."amount",
  COALESCE(pp."invoice_date", pp."paid_date"), pp."paid_date",
  pp."deleted", pp."created_at", pp."updated_at"
FROM "project_payments" pp
JOIN "projects" p ON pp."project_id" = p."id"
WHERE p."tax_type" = 'vat';

-- 3. 마이그레이션된 레코드 삭제
DELETE FROM "project_payments" pp
USING "projects" p
WHERE pp."project_id" = p."id" AND p."tax_type" = 'vat';

-- 4. project_payments에서 invoice 관련 컬럼 제거
ALTER TABLE "project_payments" DROP COLUMN "invoice_issued";
ALTER TABLE "project_payments" DROP COLUMN "invoice_date";
