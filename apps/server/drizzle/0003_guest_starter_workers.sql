CREATE TABLE "workers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"player_id" uuid NOT NULL,
	"profession_id" text NOT NULL,
	CONSTRAINT "workers_profession_id_valid" CHECK ("workers"."profession_id" in ('hunter', 'miner', 'herbalist'))
);
--> statement-breakpoint
ALTER TABLE "players" ADD COLUMN "starter_package_granted" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "workers" ADD CONSTRAINT "workers_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;