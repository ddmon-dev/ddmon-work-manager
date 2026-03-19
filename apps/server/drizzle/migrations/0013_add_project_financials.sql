CREATE TABLE "partner_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"partner_id" uuid NOT NULL,
	"description" text NOT NULL,
	"amount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"paid_date" date NOT NULL,
	"withholding_reported" boolean DEFAULT false NOT NULL,
	"withholding_reported_date" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_expenses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"description" text NOT NULL,
	"amount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"expense_date" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
ALTER TABLE "project_payments" ALTER COLUMN "paid_date" SET DEFAULT '2026-03-19';--> statement-breakpoint
ALTER TABLE "project_payments" ADD COLUMN "payment_type" text DEFAULT 'deposit' NOT NULL;--> statement-breakpoint
ALTER TABLE "project_payments" ADD COLUMN "invoice_issued" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "project_payments" ADD COLUMN "invoice_date" date;--> statement-breakpoint
ALTER TABLE "partner_payments" ADD CONSTRAINT "partner_payments_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_payments" ADD CONSTRAINT "partner_payments_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_expenses" ADD CONSTRAINT "project_expenses_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;