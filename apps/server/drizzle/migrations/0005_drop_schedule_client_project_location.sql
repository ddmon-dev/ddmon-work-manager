ALTER TABLE "schedules" DROP CONSTRAINT "schedules_project_id_projects_id_fk";
--> statement-breakpoint
ALTER TABLE "schedules" DROP CONSTRAINT "schedules_client_id_clients_id_fk";
--> statement-breakpoint
ALTER TABLE "schedules" DROP COLUMN "location";--> statement-breakpoint
ALTER TABLE "schedules" DROP COLUMN "project_id";--> statement-breakpoint
ALTER TABLE "schedules" DROP COLUMN "client_id";