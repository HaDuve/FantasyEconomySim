import { describe, expect, it, vi } from "vitest";

import { startGlobalTickScheduler } from "./tick-scheduler.js";

describe("startGlobalTickScheduler", () => {
  it("invokes the tick engine on the configured interval", async () => {
    vi.useFakeTimers();

    const runTick = vi.fn().mockResolvedValue({ tickId: 1 });
    const scheduler = startGlobalTickScheduler({
      db: {} as never,
      intervalMs: 50,
      tickEngine: { runTick },
    });

    await vi.advanceTimersByTimeAsync(125);
    scheduler.stop();
    vi.useRealTimers();

    expect(runTick.mock.calls.length).toBeGreaterThanOrEqual(2);
  });
});
