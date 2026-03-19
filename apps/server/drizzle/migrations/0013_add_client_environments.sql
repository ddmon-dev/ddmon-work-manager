CREATE TABLE "client_environment_memos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"parent_id" uuid NOT NULL,
	"content" text NOT NULL,
	"author" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "client_environments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"name" text NOT NULL,
	"hosting" jsonb,
	"domain" jsonb,
	"ftp" jsonb,
	"custom_fields" jsonb,
	"notes" text,
	"author" text,
	"updated_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
ALTER TABLE "project_payments" ALTER COLUMN "paid_date" SET DEFAULT '2026-03-19';--> statement-breakpoint
ALTER TABLE "client_environment_memos" ADD CONSTRAINT "client_environment_memos_parent_id_client_environments_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."client_environments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_environments" ADD CONSTRAINT "client_environments_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE restrict ON UPDATE no action;
