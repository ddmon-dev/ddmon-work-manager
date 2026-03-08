CREATE TABLE "project_schedule_lanes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "project_payments" ALTER COLUMN "paid_date" SET DEFAULT '2026-03-08';--> statement-breakpoint
ALTER TABLE "project_schedules" ADD COLUMN "lane_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "project_schedules" ADD COLUMN "category_color" text;--> statement-breakpoint
ALTER TABLE "project_schedule_lanes" ADD CONSTRAINT "project_schedule_lanes_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_schedules" ADD CONSTRAINT "project_schedules_lane_id_project_schedule_lanes_id_fk" FOREIGN KEY ("lane_id") REFERENCES "public"."project_schedule_lanes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_schedules" DROP COLUMN "group_id";