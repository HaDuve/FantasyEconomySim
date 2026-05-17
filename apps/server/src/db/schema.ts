import { sql } from "drizzle-orm";
import {
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
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

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
  ],
);
