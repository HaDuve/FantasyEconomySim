import type { TickBroadcast } from "@fantasy-economy-sim/domain";

import { applyTickBroadcast, initialHudState } from "./hud-state";

describe("applyTickBroadcast", () => {
  it("updates tickId, wallet, and inventory from a server tick broadcast", () => {
    const tick: TickBroadcast = {
      kind: "tick",
      tickId: 42,
      walletCrowns: 100,
      inventory: { grain: 5 },
      books: [],
      orders: [],
      assignments: [],
    };

    const next = applyTickBroadcast(initialHudState(), tick);

    expect(next.tickId).toBe(42);
    expect(next.walletCrowns).toBe(100);
    expect(next.inventory).toEqual({ grain: 5 });
  });
});
