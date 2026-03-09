CREATE TABLE "project_schedule_lanes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_schedules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"lane_id" uuid NOT NULL,
	"category" text DEFAULT 'development' NOT NULL,
	"category_color" text,
	"title" text NOT NULL,
	"description" text,
	"start_date" date NOT NULL,
	"end_date" date,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"author" text,
	"updated_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "sort_order" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
UPDATE projects SET sort_order = sub.rn FROM (
  SELECT id, ROW_NUMBER() OVER (
    ORDER BY
      CASE status WHEN 'active' THEN 0 WHEN 'pending' THEN 1 WHEN 'settling' THEN 2
        WHEN 'completed' THEN 3 WHEN 'discarded' THEN 4 END,
      contract_date ASC
  ) - 1 AS rn
  FROM projects WHERE deleted = false
) sub WHERE projects.id = sub.id;
--> statement-breakpoint
ALTER TABLE "project_schedule_lanes" ADD CONSTRAINT "project_schedule_lanes_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "project_schedules" ADD CONSTRAINT "project_schedules_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "project_schedules" ADD CONSTRAINT "project_schedules_lane_id_project_schedule_lanes_id_fk" FOREIGN KEY ("lane_id") REFERENCES "public"."project_schedule_lanes"("id") ON DELETE cascade ON UPDATE no action;
