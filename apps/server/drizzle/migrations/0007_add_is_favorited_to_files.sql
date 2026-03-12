ALTER TABLE "project_payments" ALTER COLUMN "paid_date" SET DEFAULT '2026-03-12';--> statement-breakpoint
ALTER TABLE "files" ADD COLUMN "is_favorited" boolean DEFAULT false NOT NULL;