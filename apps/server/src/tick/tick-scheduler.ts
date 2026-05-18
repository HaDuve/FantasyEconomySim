import type { Pool } from "pg";

import { createTickEngine, type TickEngine } from "./tick-engine.js";

export const DEFAULT_GLOBAL_TICK_INTERVAL_MS = 60_000;

export type GlobalTickSchedulerOptions = {
  pool: Pool;
  intervalMs?: number;
  tickEngine?: TickEngine;
  onError?: (error: unknown) => void;
};

export type GlobalTickScheduler = {
  stop(): void;
};

export function startGlobalTickScheduler(
  options: GlobalTickSchedulerOptions,
): GlobalTickScheduler {
  const intervalMs = options.intervalMs ?? DEFAULT_GLOBAL_TICK_INTERVAL_MS;
  const tickEngine = options.tickEngine ?? createTickEngine(options.pool);
  let stopped = false;
  let running = false;

  const tick = async (): Promise<void> => {
    if (stopped || running) {
      return;
    }

    running = true;

    try {
      await tickEngine.runTick();
    } catch (error) {
      options.onError?.(error);
    } finally {
      running = false;
    }
  };

  void tick();

  const timer = setInterval(() => {
    void tick();
  }, intervalMs);

  if (typeof timer.unref === "function") {
    timer.unref();
  }

  return {
    stop() {
      stopped = true;
      clearInterval(timer);
    },
  };
}
