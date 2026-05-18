import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { Pool } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createDb } from "../db/client.js";
import { runMigrations } from "../db/migrate.js";
import { globalTicks, orders, settlements } from "../db/schema.js";
import { createTickEngine } from "./tick-engine.js";

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

  it("records a completed global tick row with monotonic tick id", async () => {
    const db = createDb(pool);
    const engine = createTickEngine();

    const first = await engine.runTick(db);
    const second = await engine.runTick(db);

    expect(second.tickId).toBe(first.tickId + 1);

    const rows = await db.select().from(globalTicks).orderBy(globalTicks.tickId);
    expect(rows).toHaveLength(2);
    expect(rows.map((row) => row.tickId)).toEqual([first.tickId, second.tickId]);
  });

  it("runs phases in CONTEXT order: world drip, production, tick auction", async () => {
    const db = createDb(pool);
    const phases: string[] = [];
    const engine = createTickEngine({
      onPhaseComplete: (phase) => phases.push(phase),
    });

    await engine.runTick(db);

    expect(phases).toEqual(["worldDrip", "production", "tickAuction"]);
  });

  it("does not assign the same tick id when run concurrently", async () => {
    const db = createDb(pool);
    const engine = createTickEngine();

    const [first, second] = await Promise.all([
      engine.runTick(db),
      engine.runTick(db),
    ]);

    expect(second.tickId).toBe(first.tickId + 1);
    expect(first.tickId).not.toBe(second.tickId);
  });
});
