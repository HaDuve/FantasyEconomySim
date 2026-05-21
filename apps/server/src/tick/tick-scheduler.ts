import type { Pool } from "pg";

import { createTickEngine, type TickEngine, type TickEngineResult } from "./tick-engine.js";

export const DEFAULT_GLOBAL_TICK_INTERVAL_MS = 60_000;

export type GlobalTickSchedulerOptions = {
  pool: Pool;
  intervalMs?: number;
  tickEngine?: TickEngine;
  onTickComplete?: (result: TickEngineResult) => void | Promise<void>;
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
      const result = await tickEngine.runTick();
      await options.onTickComplete?.(result);
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
