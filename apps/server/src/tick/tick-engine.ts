import { desc, eq, sql } from "drizzle-orm";
import type { Pool } from "pg";

import { createDbFromClient, type Db } from "../db/client.js";
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

export type TickEngineProductionRunner = typeof runProductionTick;

export type TickEngineOptions = {
  onPhaseComplete?: (phase: TickPhase) => void;
  runProductionTick?: TickEngineProductionRunner;
};

export type TickEngine = {
  runTick(): Promise<TickEngineResult>;
};

const DEFAULT_PHASE_ORDER: TickPhase[] = [
  "worldDrip",
  "production",
  "tickAuction",
];

const GLOBAL_TICK_ADVISORY_LOCK_KEY = 42;

async function beginGlobalTick(db: Db): Promise<number> {
  const [row] = await db
    .insert(globalTicks)
    .values({ status: "running" })
    .returning({ tickId: globalTicks.tickId });

  if (!row) {
    throw new Error("Failed to begin global tick");
  }

  return row.tickId;
}

async function completeGlobalTick(db: Db, tickId: number): Promise<void> {
  await db
    .update(globalTicks)
    .set({ status: "completed", completedAt: new Date() })
    .where(eq(globalTicks.tickId, tickId));
}

async function failGlobalTick(
  db: Db,
  tickId: number,
  error: unknown,
): Promise<void> {
  const errorMessage = error instanceof Error ? error.message : String(error);

  await db
    .update(globalTicks)
    .set({
      status: "failed",
      completedAt: new Date(),
      errorMessage,
    })
    .where(eq(globalTicks.tickId, tickId));
}

export async function runGlobalTickPhases(
  db: Db,
  tickId: number,
  phases: TickPhase[],
  options: TickEngineOptions = {},
): Promise<Omit<TickEngineResult, "tickId">> {
  const guard = new PhaseGuard();
  const runProduction = options.runProductionTick ?? runProductionTick;
  let production: ProductionTickResult = {
    assignmentsRun: 0,
    assignmentsSkipped: 0,
    upkeepCharged: 0,
    facilityFeesCharged: 0,
  };
  let auction: TickAuctionResult = { fillsApplied: 0, fillsSkipped: 0 };

  for (const phase of phases) {
    guard.enter(phase);

    switch (phase) {
      case "worldDrip":
        await runWorldDrip(db);
        break;
      case "production":
        production = await runProduction(db);
        break;
      case "tickAuction":
        auction = await runTickAuction(db, tickId);
        break;
    }

    options.onPhaseComplete?.(phase);
  }

  return { ...production, ...auction };
}

export async function getCurrentTickId(db: Db): Promise<number> {
  const rows = await db
    .select({ tickId: globalTicks.tickId })
    .from(globalTicks)
    .where(eq(globalTicks.status, "completed"))
    .orderBy(desc(globalTicks.tickId))
    .limit(1);

  return rows[0]?.tickId ?? 0;
}

export async function runGlobalTick(pool: Pool): Promise<TickEngineResult> {
  return createTickEngine(pool).runTick();
}

export function createTickEngine(
  pool: Pool,
  options: TickEngineOptions = {},
): TickEngine {
  return {
    async runTick(): Promise<TickEngineResult> {
      const client = await pool.connect();
      const db = createDbFromClient(client) as unknown as Db;

      try {
        await db.execute(
          sql`SELECT pg_advisory_lock(${GLOBAL_TICK_ADVISORY_LOCK_KEY})`,
        );

        const tickId = await beginGlobalTick(db);

        try {
          const result = await runGlobalTickPhases(
            db,
            tickId,
            DEFAULT_PHASE_ORDER,
            options,
          );
          await completeGlobalTick(db, tickId);

          return { tickId, ...result };
        } catch (error) {
          await failGlobalTick(db, tickId, error);
          console.error("global tick failed", { tickId, error });
          throw error;
        }
      } finally {
        await db.execute(
          sql`SELECT pg_advisory_unlock(${GLOBAL_TICK_ADVISORY_LOCK_KEY})`,
        );
        client.release();
      }
    },
  };
}
