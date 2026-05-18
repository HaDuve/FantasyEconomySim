import { desc, sql } from "drizzle-orm";

import type { Db } from "../db/client.js";
import { globalTicks } from "../db/schema.js";
import { runWorldDrip } from "../market/supply-pool.js";
import { runTickAuction, type TickAuctionResult } from "../market/tick-auction.js";
import {
  runProductionTick,
  type ProductionTickResult,
} from "../production/tick-production.js";
import { PhaseGuard, TickPhaseOrderError, type TickPhase } from "./phase-guard.js";

export { TickPhaseOrderError, type TickPhase };

export type TickEngineResult = ProductionTickResult &
  TickAuctionResult & {
    tickId: number;
  };

export type TickEngineOptions = {
  onPhaseComplete?: (phase: TickPhase) => void;
};

export type TickEngine = {
  runTick(db: Db): Promise<TickEngineResult>;
};

const GLOBAL_TICK_ADVISORY_LOCK_KEY = 42;

async function withGlobalTickLock<T>(db: Db, run: () => Promise<T>): Promise<T> {
  await db.execute(sql`SELECT pg_advisory_lock(${GLOBAL_TICK_ADVISORY_LOCK_KEY})`);

  try {
    return await run();
  } finally {
    await db.execute(sql`SELECT pg_advisory_unlock(${GLOBAL_TICK_ADVISORY_LOCK_KEY})`);
  }
}

async function recordCompletedTick(db: Db): Promise<number> {
  const [row] = await db
    .insert(globalTicks)
    .values({})
    .returning({ tickId: globalTicks.tickId });

  if (!row) {
    throw new Error("Failed to record completed global tick");
  }

  return row.tickId;
}

export async function getCurrentTickId(db: Db): Promise<number> {
  const rows = await db
    .select({ tickId: globalTicks.tickId })
    .from(globalTicks)
    .orderBy(desc(globalTicks.tickId))
    .limit(1);

  return rows[0]?.tickId ?? 0;
}

export async function runGlobalTick(db: Db): Promise<TickEngineResult> {
  return createTickEngine().runTick(db);
}

export function createTickEngine(options: TickEngineOptions = {}): TickEngine {
  return {
    async runTick(db: Db): Promise<TickEngineResult> {
      return withGlobalTickLock(db, async () => {
        const guard = new PhaseGuard();

        guard.enter("worldDrip");
        await runWorldDrip(db);
        options.onPhaseComplete?.("worldDrip");

        guard.enter("production");
        const production = await runProductionTick(db);
        options.onPhaseComplete?.("production");

        guard.enter("tickAuction");
        const auction = await runTickAuction(db);
        options.onPhaseComplete?.("tickAuction");

        const tickId = await recordCompletedTick(db);

        return { tickId, ...production, ...auction };
      });
    },
  };
}
