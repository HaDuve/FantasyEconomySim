import {
  PUBLIC_BUILDING_FACILITY_FEES,
  WORKER_UPKEEP_PER_TICK,
} from "@fantasy-economy-sim/domain";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { Pool } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createDb } from "../db/client.js";
import { createPlayerWithLedger, getInventory, getWallet } from "../db/ledger.js";
import { runMigrations } from "../db/migrate.js";
import { orders, settlements, workerAssignments } from "../db/schema.js";
import { hireWorker } from "../db/workers.js";
import { runGlobalTick } from "../market/supply-pool.js";
import { purchasePrivateBuilding } from "./buildings.js";
import { setAssignment } from "./assignments.js";
import { runProductionTick } from "./tick-production.js";

describe("production", () => {
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
    await db.delete(workerAssignments);
  });

  it("yields game for Hunter field work without a building", async () => {
    const db = createDb(pool);
    const { playerId } = await createPlayerWithLedger(db, { crowns: 50 });
    const hunter = await hireWorker(db, playerId, "hunter");

    await setAssignment(db, playerId, hunter.id, "hunt_game");

    const result = await runProductionTick(db);

    expect(result.assignmentsRun).toBe(1);
    expect(await getInventory(db, playerId)).toEqual({ game: 1 });
  });

  it("requires an owned Mine before a Miner assignment yields ore", async () => {
    const db = createDb(pool);
    const { playerId } = await createPlayerWithLedger(db, { crowns: 100 });
    const miner = await hireWorker(db, playerId, "miner");

    const withoutAssignment = await runProductionTick(db);
    expect(withoutAssignment.assignmentsRun).toBe(0);
    expect(await getInventory(db, playerId)).toEqual({});

    const mine = await purchasePrivateBuilding(db, playerId, "mine");
    await setAssignment(db, playerId, miner.id, "mine_ore", mine.id);

    const withBuilding = await runProductionTick(db);
    expect(withBuilding.assignmentsRun).toBe(1);
    expect(await getInventory(db, playerId)).toEqual({ ore: 1 });
  });

  it("consumes ore and yields ingots on Smith conversion in one tick", async () => {
    const db = createDb(pool);
    const { playerId } = await createPlayerWithLedger(db, {
      crowns: 200,
      inventory: { ore: 2 },
    });
    const smith = await hireWorker(db, playerId, "smith");
    const smithy = await purchasePrivateBuilding(db, playerId, "smithy");

    await setAssignment(db, playerId, smith.id, "smith_ingots", smithy.id);

    await runProductionTick(db);

    expect(await getInventory(db, playerId)).toEqual({ ingots: 1 });
  });

  it("charges facility fee and enforces one Magic School seat per player", async () => {
    const db = createDb(pool);
    const { playerId } = await createPlayerWithLedger(db, {
      crowns: 100,
      inventory: { ingots: 1, potions: 1, lumber: 1 },
    });
    const scholar = await hireWorker(db, playerId, "scholar");
    const secondScholar = await hireWorker(db, playerId, "scholar");

    await setAssignment(db, playerId, scholar.id, "scribe_scrolls");

    const crownsBefore = (await getWallet(db, playerId))?.crowns ?? 0;

    await runProductionTick(db);

    const fee = PUBLIC_BUILDING_FACILITY_FEES.magic_school;
    expect((await getWallet(db, playerId))?.crowns).toBe(
      crownsBefore - WORKER_UPKEEP_PER_TICK * 2 - fee,
    );
    expect(await getInventory(db, playerId)).toEqual({ scrolls: 1 });

    await expect(
      setAssignment(db, playerId, secondScholar.id, "scribe_scrolls"),
    ).rejects.toMatchObject({ code: "public_building_seat_cap" });
  });

  it("debits upkeep for each employed worker after production", async () => {
    const db = createDb(pool);
    const { playerId } = await createPlayerWithLedger(db, { crowns: 100 });
    const hunter = await hireWorker(db, playerId, "hunter");
    const miner = await hireWorker(db, playerId, "miner");

    await setAssignment(db, playerId, hunter.id, "hunt_game");

    await runProductionTick(db);

    expect((await getWallet(db, playerId))?.crowns).toBe(
      100 - WORKER_UPKEEP_PER_TICK * 2,
    );
    expect(await getInventory(db, playerId)).toEqual({ game: 1 });
    expect(miner.id).toBeTruthy();
  });

  it("yields herbs for Herbalist with owned shop and compatible assignment", async () => {
    const db = createDb(pool);
    const { playerId } = await createPlayerWithLedger(db, { crowns: 100 });
    const herbalist = await hireWorker(db, playerId, "herbalist");
    const shop = await purchasePrivateBuilding(db, playerId, "herbalist_shop");

    await setAssignment(db, playerId, herbalist.id, "gather_herbs", shop.id);
    await runProductionTick(db);

    expect(await getInventory(db, playerId)).toEqual({ herbs: 1 });
  });

  it("runs one recipe chain step from ore to ingot across two production ticks", async () => {
    const db = createDb(pool);
    const { playerId } = await createPlayerWithLedger(db, { crowns: 250 });
    const miner = await hireWorker(db, playerId, "miner");
    const smith = await hireWorker(db, playerId, "smith");
    const mine = await purchasePrivateBuilding(db, playerId, "mine");
    const smithy = await purchasePrivateBuilding(db, playerId, "smithy");

    await setAssignment(db, playerId, miner.id, "mine_ore", mine.id);
    await runProductionTick(db);
    expect(await getInventory(db, playerId)).toEqual({ ore: 1 });

    await setAssignment(db, playerId, smith.id, "smith_ingots", smithy.id);
    await runProductionTick(db);
    expect(await getInventory(db, playerId)).toEqual({ ingots: 1 });
  });

  it("runs production after world drip and before tick auction on global tick", async () => {
    const db = createDb(pool);
    const { playerId } = await createPlayerWithLedger(db, { crowns: 50 });
    const hunter = await hireWorker(db, playerId, "hunter");

    await setAssignment(db, playerId, hunter.id, "hunt_game");

    const result = await runGlobalTick(db);

    expect(result.assignmentsRun).toBe(1);
    expect(await getInventory(db, playerId)).toEqual({ game: 1 });
  });
});
