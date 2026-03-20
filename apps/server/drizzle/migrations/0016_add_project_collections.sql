-- 1. project_collections 테이블 생성
CREATE TABLE "project_collections" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "project_id" uuid NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "invoice_id" uuid REFERENCES "project_invoices"("id") ON DELETE CASCADE,
  "amount" numeric(15, 2) NOT NULL DEFAULT '0',
  "paid_date" date NOT NULL,
  "payment_type" text NOT NULL DEFAULT 'deposit',
  "description" text NOT NULL DEFAULT '',
  "deleted" boolean NOT NULL DEFAULT false,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

-- 2. project_invoices의 수금완료 건 → project_collections로 이관
INSERT INTO "project_collections" (
  "project_id", "invoice_id", "amount", "paid_date",
  "payment_type", "description", "deleted", "created_at", "updated_at"
)
SELECT
  pi."project_id", pi."id", pi."amount", pi."paid_date",
  pi."payment_type", pi."description", pi."deleted",
  pi."created_at", pi."updated_at"
FROM "project_invoices" pi
WHERE pi."paid_date" IS NOT NULL;

-- 3. project_payments → project_collections로 이관 (invoice_id = NULL)
INSERT INTO "project_collections" (
  "id", "project_id", "invoice_id", "amount", "paid_date",
  "payment_type", "description", "deleted", "created_at", "updated_at"
)
SELECT
  pp."id", pp."project_id", NULL, pp."amount", pp."paid_date",
  pp."payment_type", pp."description", pp."deleted",
  pp."created_at", pp."updated_at"
FROM "project_payments" pp;

-- 4. project_invoices에서 paid_date 컬럼 제거
ALTER TABLE "project_invoices" DROP COLUMN "paid_date";

-- 5. project_payments 테이블 제거
DROP TABLE "project_payments";

-- 6. partner_payments에 tax_type 추가
ALTER TABLE "partner_payments" ADD COLUMN "tax_type" text NOT NULL DEFAULT 'withholding';
