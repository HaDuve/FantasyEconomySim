CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"player_id" uuid NOT NULL,
	"resource_id" text NOT NULL,
	"side" text NOT NULL,
	"price" integer NOT NULL,
	"quantity" integer NOT NULL,
	"placed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "orders_side_valid" CHECK ("orders"."side" in ('buy', 'sell')),
	CONSTRAINT "orders_price_positive" CHECK ("orders"."price" > 0),
	CONSTRAINT "orders_quantity_non_negative" CHECK ("orders"."quantity" >= 0),
	CONSTRAINT "orders_resource_id_valid" CHECK ("orders"."resource_id" in ('grain', 'game', 'lumber', 'ore', 'herbs', 'ingots', 'potions', 'scrolls'))
);
--> statement-breakpoint
CREATE TABLE "settlements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"resource_id" text NOT NULL,
	"price" integer NOT NULL,
	"quantity" integer NOT NULL,
	"buy_order_id" uuid NOT NULL,
	"sell_order_id" uuid NOT NULL,
	"buyer_player_id" uuid NOT NULL,
	"seller_player_id" uuid NOT NULL,
	"settled_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "settlements_price_positive" CHECK ("settlements"."price" > 0),
	CONSTRAINT "settlements_quantity_positive" CHECK ("settlements"."quantity" > 0),
	CONSTRAINT "settlements_resource_id_valid" CHECK ("settlements"."resource_id" in ('grain', 'game', 'lumber', 'ore', 'herbs', 'ingots', 'potions', 'scrolls'))
);
--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_buy_order_id_orders_id_fk" FOREIGN KEY ("buy_order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_sell_order_id_orders_id_fk" FOREIGN KEY ("sell_order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_buyer_player_id_players_id_fk" FOREIGN KEY ("buyer_player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_seller_player_id_players_id_fk" FOREIGN KEY ("seller_player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;