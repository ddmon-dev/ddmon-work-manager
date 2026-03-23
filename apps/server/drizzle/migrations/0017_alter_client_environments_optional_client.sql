ALTER TABLE "client_environments" ALTER COLUMN "client_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "client_environments" ADD COLUMN "customer_name" text;