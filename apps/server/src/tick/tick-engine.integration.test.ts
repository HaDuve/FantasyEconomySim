import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { Pool } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createDb } from "../db/client.js";
import { runMigrations } from "../db/migrate.js";
import { globalTicks, orders, settlements } from "../db/schema.js";
import { createPlayerWithLedger } from "../db/ledger.js";
import { placeOrder } from "../market/orders.js";
import {
  createTickEngine,
  getCurrentTickId,
  runGlobalTickPhases,
  TickPhaseOrderError,
} from "./tick-engine.js";

describe("TickEngine", () => {
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
    await db.delete(globalTicks);
  });

  it("getCurrentTickId returns the last completed global tick", async () => {
    const db = createDb(pool);

    expect(await getCurrentTickId(db)).toBe(0);

    const { tickId } = await createTickEngine(pool).runTick();

    expect(await getCurrentTickId(db)).toBe(tickId);
  });

  it("records a completed global tick row with monotonic tick id", async () => {
    const db = createDb(pool);
    const engine = createTickEngine(pool);

    const first = await engine.runTick(db);
    const second = await engine.runTick(db);

    expect(second.tickId).toBe(first.tickId + 1);

    const rows = await db.select().from(globalTicks).orderBy(globalTicks.tickId);
    expect(rows).toHaveLength(2);
    expect(rows.map((row) => row.tickId)).toEqual([first.tickId, second.tickId]);
    expect(rows.every((row) => row.status === "completed")).toBe(true);
  });

  it("runs phases in CONTEXT order: world drip, production, tick auction", async () => {
    const db = createDb(pool);
    const phases: string[] = [];
    const engine = createTickEngine(pool, {
      onPhaseComplete: (phase) => phases.push(phase),
    });

    await engine.runTick(db);

    expect(phases).toEqual(["worldDrip", "production", "tickAuction"]);
  });

  it("does not assign the same tick id when run concurrently", async () => {
    const db = createDb(pool);
    const engine = createTickEngine(pool);

    const [first, second] = await Promise.all([
      engine.runTick(db),
      engine.runTick(db),
    ]);

    expect(second.tickId).toBe(first.tickId + 1);
    expect(first.tickId).not.toBe(second.tickId);
  });

  it("rejects production after tick auction through the shared phase runner", async () => {
    const db = createDb(pool);

    await expect(
      runGlobalTickPhases(db, 1, ["worldDrip", "tickAuction", "production"]),
    ).rejects.toThrow(TickPhaseOrderError);
  });

  it("records settlements with the global tick id", async () => {
    const db = createDb(pool);
    const buyer = await createPlayerWithLedger(db, { crowns: 120 });
    const seller = await createPlayerWithLedger(db, {
      crowns: 0,
      inventory: { grain: 10 },
    });

    await placeOrder(db, buyer.playerId, {
      resourceId: "grain",
      side: "buy",
      price: 12,
      quantity: 5,
    });
    await placeOrder(db, seller.playerId, {
      resourceId: "grain",
      side: "sell",
      price: 10,
      quantity: 4,
    });

    const { tickId } = await createTickEngine(pool).runTick();

    const rows = await db.select().from(settlements);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.tickId).toBe(tickId);
  });

  it("marks the global tick failed when a phase throws", async () => {
    const db = createDb(pool);
    const engine = createTickEngine(pool, {
      runProductionTick: async () => {
        throw new Error("simulated production failure");
      },
    });

    await expect(engine.runTick()).rejects.toThrow("simulated production failure");

    const rows = await db.select().from(globalTicks);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.status).toBe("failed");
    expect(rows[0]?.errorMessage).toContain("simulated production failure");
  });
});
