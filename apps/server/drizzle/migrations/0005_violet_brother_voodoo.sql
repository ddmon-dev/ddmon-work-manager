CREATE TABLE "business_info" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text,
	"ceo" text,
	"biz_number" text,
	"address" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "estimates" ALTER COLUMN "tax_type" SET DEFAULT 'vat';--> statement-breakpoint
ALTER TABLE "project_payments" ALTER COLUMN "paid_date" SET DEFAULT '2026-03-01';--> statement-breakpoint
ALTER TABLE "estimates" ADD COLUMN "publisher_info" jsonb;