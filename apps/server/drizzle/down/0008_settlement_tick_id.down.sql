ALTER TABLE "settlements" DROP CONSTRAINT IF EXISTS "settlements_tick_id_global_ticks_tick_id_fk";
ALTER TABLE "settlements" DROP COLUMN IF EXISTS "tick_id";
ALTER TABLE "global_ticks" DROP CONSTRAINT IF EXISTS "global_ticks_status_valid";
ALTER TABLE "global_ticks" DROP COLUMN IF EXISTS "error_message";
ALTER TABLE "global_ticks" DROP COLUMN IF EXISTS "status";
ALTER TABLE "global_ticks" ALTER COLUMN "completed_at" SET DEFAULT now();
ALTER TABLE "global_ticks" ALTER COLUMN "completed_at" SET NOT NULL;
