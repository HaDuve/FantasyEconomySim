CREATE TABLE "inventory" (
	"player_id" uuid NOT NULL,
	"resource_id" text NOT NULL,
	"quantity" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "inventory_player_id_resource_id_pk" PRIMARY KEY("player_id","resource_id"),
	CONSTRAINT "inventory_quantity_non_negative" CHECK ("inventory"."quantity" >= 0)
);
--> statement-breakpoint
CREATE TABLE "wallets" (
	"player_id" uuid PRIMARY KEY NOT NULL,
	"crowns" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "wallets_crowns_non_negative" CHECK ("wallets"."crowns" >= 0)
);
--> statement-breakpoint
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;