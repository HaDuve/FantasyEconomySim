import { WORLD_DRIP_PER_TICK } from "@fantasy-economy-sim/domain";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { Pool } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createDb } from "../db/client.js";
import { createPlayerWithLedger, getInventory, getWallet } from "../db/ledger.js";
import { runMigrations } from "../db/migrate.js";
import { gt } from "drizzle-orm";

import { orders, settlements, supplyPool } from "../db/schema.js";
import {
  EmptySupplyPoolError,
  InsufficientCrownsError,
  NotPoolResourceError,
} from "./errors.js";
import { getSupplyPool, poolBuy, runGlobalTick, runWorldDrip } from "./supply-pool.js";

describe("supply pool", () => {
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
    await db.update(supplyPool).set({ quantity: 0 });
  });

  it("increases pool quantities per config when world drip runs", async () => {
    const db = createDb(pool);

    await runWorldDrip(db);

    expect(await getSupplyPool(db)).toEqual(WORLD_DRIP_PER_TICK);
  });

  it("rejects pool buy for tier 3+ resources", async () => {
    const db = createDb(pool);
    const { playerId } = await createPlayerWithLedger(db, { crowns: 100 });

    await expect(poolBuy(db, playerId, "ingots", 1)).rejects.toThrow(
      NotPoolResourceError,
    );
  });

  it("rejects pool buy when supply pool is empty", async () => {
    const db = createDb(pool);
    const { playerId } = await createPlayerWithLedger(db, { crowns: 100 });

    await expect(poolBuy(db, playerId, "grain", 1)).rejects.toThrow(
      EmptySupplyPoolError,
    );
  });

  it("rejects pool buy when wallet crowns are insufficient", async () => {
    const db = createDb(pool);
    const { playerId } = await createPlayerWithLedger(db, { crowns: 2 });

    await runWorldDrip(db);

    await expect(poolBuy(db, playerId, "grain", 2)).rejects.toThrow(
      InsufficientCrownsError,
    );

    expect((await getWallet(db, playerId))?.crowns).toBe(2);
    expect(await getSupplyPool(db)).toEqual(WORLD_DRIP_PER_TICK);
  });

  it("debits wallet and credits inventory without creating an order", async () => {
    const db = createDb(pool);
    const { playerId } = await createPlayerWithLedger(db, { crowns: 100 });

    await runWorldDrip(db);
    await poolBuy(db, playerId, "grain", 3);

    expect((await getWallet(db, playerId))?.crowns).toBe(91);
    expect(await getInventory(db, playerId)).toEqual({ grain: 3 });
    expect(await getSupplyPool(db)).toEqual({
      ...WORLD_DRIP_PER_TICK,
      grain: WORLD_DRIP_PER_TICK.grain - 3,
    });
    const openOrders = await db
      .select({ id: orders.id })
      .from(orders)
      .where(gt(orders.quantity, 0));
    expect(openOrders).toHaveLength(0);
  });

  it("runs world drip before tick auction on global tick", async () => {
    const db = createDb(pool);
    const { playerId } = await createPlayerWithLedger(db, { crowns: 100 });

    await runGlobalTick(db);

    expect(await getSupplyPool(db)).toEqual(WORLD_DRIP_PER_TICK);
  });
});
