ALTER TABLE "estimates" ADD COLUMN "billing_client_id" uuid;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "billing_client_id" uuid;--> statement-breakpoint
ALTER TABLE "estimates" ADD CONSTRAINT "estimates_billing_client_id_clients_id_fk" FOREIGN KEY ("billing_client_id") REFERENCES "public"."clients"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_billing_client_id_clients_id_fk" FOREIGN KEY ("billing_client_id") REFERENCES "public"."clients"("id") ON DELETE restrict ON UPDATE no action;