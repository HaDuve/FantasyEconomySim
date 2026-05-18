ALTER TABLE "global_ticks" ALTER COLUMN "completed_at" DROP DEFAULT;
ALTER TABLE "global_ticks" ALTER COLUMN "completed_at" DROP NOT NULL;
ALTER TABLE "global_ticks" ADD COLUMN "status" text DEFAULT 'completed' NOT NULL;
ALTER TABLE "global_ticks" ADD COLUMN "error_message" text;
ALTER TABLE "global_ticks" ADD CONSTRAINT "global_ticks_status_valid" CHECK ("status" in ('running', 'completed', 'failed'));
--> statement-breakpoint
ALTER TABLE "settlements" ADD COLUMN "tick_id" bigint NOT NULL;
--> statement-breakpoint
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_tick_id_global_ticks_tick_id_fk" FOREIGN KEY ("tick_id") REFERENCES "public"."global_ticks"("tick_id") ON DELETE no action ON UPDATE no action;
