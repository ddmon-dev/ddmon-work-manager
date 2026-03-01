-- taxType 정책 변경: exclusive/inclusive → vat
-- contractAmount는 공급가액(VAT 제외)으로 통일

-- 1. VAT 프로젝트의 contractAmount를 공급가액으로 먼저 변환 (tax_type 변경 전)
UPDATE "projects"
SET "contract_amount" = ROUND("contract_amount" / 1.1),
    "updated_at" = NOW()
WHERE "tax_type" IN ('exclusive', 'inclusive')
  AND "contract_amount" IS NOT NULL
  AND "deleted" = false;
--> statement-breakpoint

-- 2. taxType 값 통일: exclusive/inclusive → vat
UPDATE "estimates" SET "tax_type" = 'vat' WHERE "tax_type" IN ('exclusive', 'inclusive');
--> statement-breakpoint

UPDATE "projects" SET "tax_type" = 'vat' WHERE "tax_type" IN ('exclusive', 'inclusive');
--> statement-breakpoint

-- 3. estimates 기본값 변경
ALTER TABLE "estimates" ALTER COLUMN "tax_type" SET DEFAULT 'vat';
