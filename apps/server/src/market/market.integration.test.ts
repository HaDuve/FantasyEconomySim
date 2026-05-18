import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { Pool } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createDb } from "../db/client.js";
import { createPlayerWithLedger } from "../db/ledger.js";
import { runMigrations } from "../db/migrate.js";
import { orders, settlements } from "../db/schema.js";
import { getInventory, getWallet, setWalletCrowns } from "../db/ledger.js";
import { InsufficientCrownsError, InsufficientInventoryError } from "./errors.js";
import { cancelOrder, getOpenOrder, placeOrder } from "./orders.js";
import { runTickAuction } from "./tick-auction.js";

describe("market", () => {
  let container: Awaited<ReturnType<PostgreSqlContainer["start"]>>;
  let pool: Pool;

  beforeAll(async () => {
    container = await new PostgreSqlContainer("postgres:16-alpine").start();
    pool = new Pool({ connectionString: container.getConnectionUri() });
    await runMigrations(pool);
  }, 120_000);

  afterAll(async () => {
    await pool?.end();
    await container?.stop();
  });

  beforeEach(async () => {
    const db = createDb(pool);
    await db.delete(settlements);
    await db.delete(orders);
  });

  it("persists a GTC buy limit order with price, quantity, and timestamp", async () => {
    const db = createDb(pool);
    const { playerId } = await createPlayerWithLedger(db, { crowns: 100 });

    const placed = await placeOrder(db, playerId, {
      resourceId: "grain",
      side: "buy",
      price: 10,
      quantity: 5,
    });

    expect(placed).toMatchObject({
      playerId,
      resourceId: "grain",
      side: "buy",
      price: 10,
      quantity: 5,
    });
    expect(placed.id).toBeTruthy();
    expect(placed.placedAt).toBeInstanceOf(Date);

    const open = await getOpenOrder(db, placed.id);
    expect(open).toEqual(placed);
  });

  it("removes an open order when cancelled before the next tick auction", async () => {
    const db = createDb(pool);
    const { playerId } = await createPlayerWithLedger(db, { crowns: 50 });

    const placed = await placeOrder(db, playerId, {
      resourceId: "grain",
      side: "buy",
      price: 8,
      quantity: 2,
    });

    await cancelOrder(db, playerId, placed.id);

    expect(await getOpenOrder(db, placed.id)).toBeUndefined();
  });

  it("rejects a second buy when open orders would over-commit wallet crowns", async () => {
    const db = createDb(pool);
    const { playerId } = await createPlayerWithLedger(db, { crowns: 100 });

    await placeOrder(db, playerId, {
      resourceId: "grain",
      side: "buy",
      price: 10,
      quantity: 6,
    });

    await expect(
      placeOrder(db, playerId, {
        resourceId: "ore",
        side: "buy",
        price: 10,
        quantity: 5,
      }),
    ).rejects.toThrow(InsufficientCrownsError);

    expect((await getWallet(db, playerId))?.crowns).toBe(100);
  });

  it("rejects a second sell when open orders would over-commit inventory", async () => {
    const db = createDb(pool);
    const { playerId } = await createPlayerWithLedger(db, {
      crowns: 0,
      inventory: { grain: 10 },
    });

    await placeOrder(db, playerId, {
      resourceId: "grain",
      side: "sell",
      price: 5,
      quantity: 6,
    });

    await expect(
      placeOrder(db, playerId, {
        resourceId: "grain",
        side: "sell",
        price: 5,
        quantity: 5,
      }),
    ).rejects.toThrow(InsufficientInventoryError);

    expect(await getInventory(db, playerId)).toEqual({ grain: 10 });
  });

  it("skips an unsettleable top pair and settles the next cross in the same auction", async () => {
    const db = createDb(pool);
    const brokeBuyer = await createPlayerWithLedger(db, { crowns: 100 });
    const readyBuyer = await createPlayerWithLedger(db, { crowns: 100 });
    const seller = await createPlayerWithLedger(db, {
      crowns: 0,
      inventory: { grain: 20 },
    });

    await placeOrder(db, brokeBuyer.playerId, {
      resourceId: "grain",
      side: "buy",
      price: 10,
      quantity: 10,
    });
    await setWalletCrowns(db, brokeBuyer.playerId, 0);
    await placeOrder(db, readyBuyer.playerId, {
      resourceId: "grain",
      side: "buy",
      price: 10,
      quantity: 5,
    });
    await placeOrder(db, seller.playerId, {
      resourceId: "grain",
      side: "sell",
      price: 8,
      quantity: 10,
    });

    const { fillsApplied, fillsSkipped } = await runTickAuction(db);

    expect(fillsSkipped).toBe(1);
    expect(fillsApplied).toBe(1);
    expect((await getWallet(db, readyBuyer.playerId))?.crowns).toBe(60);
    expect(await getInventory(db, readyBuyer.playerId)).toEqual({ grain: 5 });
    expect((await getWallet(db, seller.playerId))?.crowns).toBe(40);
    expect(await getInventory(db, seller.playerId)).toEqual({ grain: 15 });
  });

  it("runs a manual tick auction with partial fill and correct settlements", async () => {
    const db = createDb(pool);
    const buyer = await createPlayerWithLedger(db, { crowns: 120 });
    const seller = await createPlayerWithLedger(db, {
      crowns: 0,
      inventory: { grain: 20 },
    });

    const buyOrder = await placeOrder(db, buyer.playerId, {
      resourceId: "grain",
      side: "buy",
      price: 12,
      quantity: 10,
    });
    await placeOrder(db, seller.playerId, {
      resourceId: "grain",
      side: "sell",
      price: 10,
      quantity: 4,
    });

    const { fillsApplied } = await runTickAuction(db);

    expect(fillsApplied).toBe(1);
    expect((await getWallet(db, buyer.playerId))?.crowns).toBe(80);
    expect(await getInventory(db, buyer.playerId)).toEqual({ grain: 4 });
    expect((await getWallet(db, seller.playerId))?.crowns).toBe(40);
    expect(await getInventory(db, seller.playerId)).toEqual({ grain: 16 });

    const remainder = await getOpenOrder(db, buyOrder.id);
    expect(remainder).toMatchObject({
      side: "buy",
      price: 12,
      quantity: 6,
    });
  });
});
