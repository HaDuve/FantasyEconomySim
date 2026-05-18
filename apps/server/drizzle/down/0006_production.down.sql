DROP INDEX IF EXISTS "worker_assignments_public_seat_cap";--> statement-breakpoint
DROP TABLE IF EXISTS "worker_assignments";--> statement-breakpoint
DROP TABLE IF EXISTS "private_buildings";--> statement-breakpoint
ALTER TABLE "workers" DROP CONSTRAINT "workers_profession_id_valid";--> statement-breakpoint
ALTER TABLE "workers" ADD CONSTRAINT "workers_profession_id_valid" CHECK ("workers"."profession_id" in ('hunter', 'miner', 'herbalist'));
