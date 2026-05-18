import { describe, expect, it } from "vitest";
import {
  CONVERSION_RECIPES,
  match,
  type CancelOrderCommand,
  type PlaceOrderCommand,
  type PoolBuyCommand,
  type SetAssignmentCommand,
} from "./index.js";

describe("public API", () => {
  it("exports per-command types for handler narrowing", () => {
    const placeOrder: PlaceOrderCommand = {
      kind: "place_order",
      resourceId: "grain",
      side: "buy",
      price: 10,
      quantity: 5,
    };
    const cancel: CancelOrderCommand = {
      kind: "cancel_order",
      orderId: "order-1",
    };
    const poolBuy: PoolBuyCommand = {
      kind: "pool_buy",
      resourceId: "lumber",
      quantity: 1,
    };
    const setAssignment: SetAssignmentCommand = {
      kind: "set_assignment",
      buildingId: "mine-1",
      assignmentId: "mine-ore",
    };

    expect(placeOrder.kind).toBe("place_order");
    expect(cancel.kind).toBe("cancel_order");
    expect(poolBuy.kind).toBe("pool_buy");
    expect(setAssignment.kind).toBe("set_assignment");
  });

  it("exports match for tick auction from the package root", () => {
    const result = match(
      "grain",
      [{ orderId: "b1", price: 10, quantity: 1, placedAt: 1 }],
      [{ orderId: "a1", price: 9, quantity: 1, placedAt: 2 }],
    );

    expect(result.fills).toHaveLength(1);
  });

  it("documents conversion output yield per global tick", () => {
    for (const recipe of Object.values(CONVERSION_RECIPES)) {
      expect(recipe.outputPerGlobalTick).toBe(1);
    }
  });
});
