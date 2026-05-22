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

  it("updates open orders and market books from each tick broadcast", () => {
    const tick: TickBroadcast = {
      kind: "tick",
      tickId: 2,
      walletCrowns: 90,
      inventory: {},
      books: [
        {
          resourceId: "grain",
          bids: [{ orderId: "b1", price: 5, quantity: 2 }],
          asks: [{ orderId: "a1", price: 7, quantity: 1 }],
        },
      ],
      orders: [
        {
          id: "o1",
          resourceId: "grain",
          side: "buy",
          price: 5,
          quantity: 2,
        },
      ],
      assignments: [],
    };

    const next = applyTickBroadcast(initialHudState(), tick);

    expect(next.books).toEqual(tick.books);
    expect(next.orders).toEqual(tick.orders);
  });

  it("stores active assignments from each tick broadcast", () => {
    const tick: TickBroadcast = {
      kind: "tick",
      tickId: 3,
      walletCrowns: 80,
      inventory: { game: 1 },
      books: [],
      orders: [],
      assignments: [
        {
          workerId: "w1",
          assignmentId: "hunt_game",
        },
      ],
    };

    const next = applyTickBroadcast(initialHudState(), tick);

    expect(next.assignments).toEqual(tick.assignments);
    expect(next.inventory).toEqual({ game: 1 });
  });

  it("clears stale command errors when a tick broadcast arrives", () => {
    const state = { ...initialHudState(), errorMessage: "place_order: invalid_price" };
    const tick: TickBroadcast = {
      kind: "tick",
      tickId: 1,
      walletCrowns: 100,
      inventory: {},
      books: [],
      orders: [],
      assignments: [],
    };

    expect(applyTickBroadcast(state, tick).errorMessage).toBeNull();
  });
});
