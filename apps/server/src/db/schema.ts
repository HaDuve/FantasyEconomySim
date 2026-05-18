import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

/** Maps Firebase Auth uid to internal player id (ADR-0003). */
export const players = pgTable("players", {
  id: uuid("id").primaryKey().defaultRandom(),
  firebaseUid: text("firebase_uid").unique(),
  starterPackageGranted: boolean("starter_package_granted")
    .notNull()
    .default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/** A hired **worker** with a **profession** (CONTEXT). */
export const workers = pgTable(
  "workers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    playerId: uuid("player_id")
      .notNull()
      .references(() => players.id, { onDelete: "cascade" }),
    professionId: text("profession_id").notNull(),
  },
  (table) => [
    check(
      "workers_profession_id_valid",
      sql`${table.professionId} in ('hunter', 'miner', 'herbalist')`,
    ),
  ],
);

/** One row per player — **crowns** in the **wallet** (CONTEXT). */
export const wallets = pgTable(
  "wallets",
  {
    playerId: uuid("player_id")
      .primaryKey()
      .references(() => players.id, { onDelete: "cascade" }),
    crowns: integer("crowns").notNull().default(0),
  },
  (table) => [
    check("wallets_crowns_non_negative", sql`${table.crowns} >= 0`),
  ],
);

/** **Resource** quantities held in a player's **inventory**. */
export const inventory = pgTable(
  "inventory",
  {
    playerId: uuid("player_id")
      .notNull()
      .references(() => players.id, { onDelete: "cascade" }),
    resourceId: text("resource_id").notNull(),
    quantity: integer("quantity").notNull().default(0),
  },
  (table) => [
    primaryKey({ columns: [table.playerId, table.resourceId] }),
    check("inventory_quantity_non_negative", sql`${table.quantity} >= 0`),
    check(
      "inventory_resource_id_valid",
      sql`${table.resourceId} in ('grain', 'game', 'lumber', 'ore', 'herbs', 'ingots', 'potions', 'scrolls')`,
    ),
  ],
);
