import { describe, expect, it } from "vitest";
import type { WalletCrowns } from "./crown.js";
import type { ClientCommand, TickBroadcast } from "./messages.js";

describe("tick and command messages", () => {
  it("broadcasts global tick state to connected clients", () => {
    const broadcast: TickBroadcast = {
      kind: "tick",
      tickId: 1,
      books: [],
      walletCrowns: 100 satisfies WalletCrowns,
      inventory: {},
      orders: [],
      assignments: [],
    };
    expect(broadcast.kind).toBe("tick");
    expect(broadcast.tickId).toBe(1);
  });

  it("accepts client commands as a discriminated union", () => {
    const placeOrder: ClientCommand = {
      kind: "place_order",
      resourceId: "grain",
      side: "buy",
      price: 10,
      quantity: 5,
    };
    const poolBuy: ClientCommand = {
      kind: "pool_buy",
      resourceId: "lumber",
      quantity: 1,
    };
    expect(placeOrder.kind).toBe("place_order");
    expect(poolBuy.kind).toBe("pool_buy");
  });
});
