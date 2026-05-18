ALTER TABLE "workers" DROP CONSTRAINT "workers_profession_id_valid";--> statement-breakpoint
ALTER TABLE "workers" ADD CONSTRAINT "workers_profession_id_valid" CHECK ("workers"."profession_id" in ('hunter', 'miner', 'herbalist', 'miller', 'sawyer', 'smith', 'alchemist', 'scholar'));--> statement-breakpoint
CREATE TABLE "private_buildings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"player_id" uuid NOT NULL,
	"building_type_id" text NOT NULL,
	CONSTRAINT "private_buildings_type_valid" CHECK ("private_buildings"."building_type_id" in ('herbalist_shop', 'mine', 'mill', 'sawmill', 'smithy', 'alchemy'))
);
--> statement-breakpoint
CREATE TABLE "worker_assignments" (
	"worker_id" uuid PRIMARY KEY NOT NULL,
	"player_id" uuid NOT NULL,
	"assignment_id" text NOT NULL,
	"private_building_id" uuid,
	"public_building_type_id" text,
	CONSTRAINT "worker_assignments_assignment_id_valid" CHECK ("worker_assignments"."assignment_id" in ('hunt_game', 'mine_ore', 'gather_herbs', 'mill_grain', 'saw_lumber', 'smith_ingots', 'brew_potions', 'scribe_scrolls')),
	CONSTRAINT "worker_assignments_public_building_type_valid" CHECK ("worker_assignments"."public_building_type_id" is null or "worker_assignments"."public_building_type_id" in ('magic_school'))
);
--> statement-breakpoint
ALTER TABLE "private_buildings" ADD CONSTRAINT "private_buildings_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "worker_assignments" ADD CONSTRAINT "worker_assignments_worker_id_workers_id_fk" FOREIGN KEY ("worker_id") REFERENCES "public"."workers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "worker_assignments" ADD CONSTRAINT "worker_assignments_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "worker_assignments" ADD CONSTRAINT "worker_assignments_private_building_id_private_buildings_id_fk" FOREIGN KEY ("private_building_id") REFERENCES "public"."private_buildings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "worker_assignments_public_seat_cap" ON "worker_assignments" ("player_id","public_building_type_id") WHERE "worker_assignments"."public_building_type_id" is not null;
