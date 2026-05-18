CREATE TABLE "supply_pool" (
	"resource_id" text PRIMARY KEY NOT NULL,
	"quantity" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "supply_pool_quantity_non_negative" CHECK ("supply_pool"."quantity" >= 0),
	CONSTRAINT "supply_pool_resource_id_valid" CHECK ("supply_pool"."resource_id" in ('grain', 'game', 'lumber', 'ore', 'herbs'))
);
--> statement-breakpoint
INSERT INTO "supply_pool" ("resource_id", "quantity") VALUES
  ('grain', 0),
  ('game', 0),
  ('lumber', 0),
  ('ore', 0),
  ('herbs', 0);
