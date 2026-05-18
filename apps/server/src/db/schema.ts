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

/** Open **GTC** limit **order** on the **market** (CONTEXT). */
export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    playerId: uuid("player_id")
      .notNull()
      .references(() => players.id, { onDelete: "cascade" }),
    resourceId: text("resource_id").notNull(),
    side: text("side").notNull(),
    price: integer("price").notNull(),
    /** Open qty; 0 = fully filled (row kept for settlement FKs). */
    quantity: integer("quantity").notNull(),
    placedAt: timestamp("placed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check("orders_side_valid", sql`${table.side} in ('buy', 'sell')`),
    check("orders_price_positive", sql`${table.price} > 0`),
    check("orders_quantity_non_negative", sql`${table.quantity} >= 0`),
    check(
      "orders_resource_id_valid",
      sql`${table.resourceId} in ('grain', 'game', 'lumber', 'ore', 'herbs', 'ingots', 'potions', 'scrolls')`,
    ),
  ],
);

/** Append-only **settlement** from a **tick auction** match (CONTEXT). */
export const settlements = pgTable(
  "settlements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    resourceId: text("resource_id").notNull(),
    price: integer("price").notNull(),
    quantity: integer("quantity").notNull(),
    buyOrderId: uuid("buy_order_id")
      .notNull()
      .references(() => orders.id),
    sellOrderId: uuid("sell_order_id")
      .notNull()
      .references(() => orders.id),
    buyerPlayerId: uuid("buyer_player_id")
      .notNull()
      .references(() => players.id),
    sellerPlayerId: uuid("seller_player_id")
      .notNull()
      .references(() => players.id),
    settledAt: timestamp("settled_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check("settlements_price_positive", sql`${table.price} > 0`),
    check("settlements_quantity_positive", sql`${table.quantity} > 0`),
    check(
      "settlements_resource_id_valid",
      sql`${table.resourceId} in ('grain', 'game', 'lumber', 'ore', 'herbs', 'ingots', 'potions', 'scrolls')`,
    ),
  ],
);

/** World **supply pool** stock for tier 1–2 **resources** (CONTEXT). */
export const supplyPool = pgTable(
  "supply_pool",
  {
    resourceId: text("resource_id").primaryKey(),
    quantity: integer("quantity").notNull().default(0),
  },
  (table) => [
    check(
      "supply_pool_quantity_non_negative",
      sql`${table.quantity} >= 0`,
    ),
    check(
      "supply_pool_resource_id_valid",
      sql`${table.resourceId} in ('grain', 'game', 'lumber', 'ore', 'herbs')`,
    ),
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
