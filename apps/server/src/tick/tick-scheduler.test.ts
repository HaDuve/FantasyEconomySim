import { describe, expect, it, vi } from "vitest";

import { startGlobalTickScheduler } from "./tick-scheduler.js";

describe("startGlobalTickScheduler", () => {
  it("runs the first global tick immediately on start", () => {
    const runTick = vi.fn().mockResolvedValue({ tickId: 1 });

    const scheduler = startGlobalTickScheduler({
      pool: {} as never,
      intervalMs: 60_000,
      tickEngine: { runTick },
    });

    scheduler.stop();

    expect(runTick).toHaveBeenCalledTimes(1);
  });

  it("invokes the tick engine on the configured interval", async () => {
    vi.useFakeTimers();

    const runTick = vi.fn().mockResolvedValue({ tickId: 1 });
    const scheduler = startGlobalTickScheduler({
      pool: {} as never,
      intervalMs: 50,
      tickEngine: { runTick },
    });

    await vi.advanceTimersByTimeAsync(125);
    scheduler.stop();
    vi.useRealTimers();

    expect(runTick.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it("calls onTickComplete after a successful tick", async () => {
    const result = { tickId: 7, fillsApplied: 0, fillsSkipped: 0 };
    const runTick = vi.fn().mockResolvedValue(result);
    const onTickComplete = vi.fn();

    const scheduler = startGlobalTickScheduler({
      pool: {} as never,
      intervalMs: 60_000,
      tickEngine: { runTick },
      onTickComplete,
    });

    await vi.waitFor(() => expect(onTickComplete).toHaveBeenCalledWith(result));
    scheduler.stop();
  });
});
