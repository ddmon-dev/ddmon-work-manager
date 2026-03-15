ALTER TABLE "files" ADD COLUMN "owner_type" text DEFAULT 'drive' NOT NULL;--> statement-breakpoint
ALTER TABLE "files" ADD COLUMN "owner_id" uuid;--> statement-breakpoint
CREATE INDEX "idx_files_owner" ON "files" USING btree ("owner_type","owner_id") WHERE deleted = false;