import { describe, expect, it } from "vitest";
import { match, type LimitOrder } from "./order-book.js";

describe("OrderBook.match", () => {
  it("returns no fills when bids and asks are empty", () => {
    const result = match("grain", [], []);

    expect(result.fills).toEqual([]);
    expect(result.remainingBids).toEqual([]);
    expect(result.remainingAsks).toEqual([]);
  });

  it("fully matches when best bid crosses best ask", () => {
    const bids: LimitOrder[] = [
      { orderId: "b1", price: 10, quantity: 5, placedAt: 1 },
    ];
    const asks: LimitOrder[] = [
      { orderId: "a1", price: 8, quantity: 5, placedAt: 2 },
    ];

    const result = match("grain", bids, asks);

    expect(result.fills).toEqual([
      { buyOrderId: "b1", sellOrderId: "a1", price: 8, quantity: 5 },
    ]);
    expect(result.remainingBids).toEqual([]);
    expect(result.remainingAsks).toEqual([]);
  });

  it("leaves orders on the book when best bid is below best ask", () => {
    const bids: LimitOrder[] = [
      { orderId: "b1", price: 7, quantity: 4, placedAt: 1 },
    ];
    const asks: LimitOrder[] = [
      { orderId: "a1", price: 9, quantity: 4, placedAt: 2 },
    ];

    const result = match("lumber", bids, asks);

    expect(result.fills).toEqual([]);
    expect(result.remainingBids).toEqual(bids);
    expect(result.remainingAsks).toEqual(asks);
  });

  it("partially fills and leaves remainder at original price", () => {
    const bids: LimitOrder[] = [
      { orderId: "b1", price: 12, quantity: 10, placedAt: 1 },
    ];
    const asks: LimitOrder[] = [
      { orderId: "a1", price: 10, quantity: 4, placedAt: 2 },
    ];

    const result = match("ore", bids, asks);

    expect(result.fills).toEqual([
      { buyOrderId: "b1", sellOrderId: "a1", price: 10, quantity: 4 },
    ]);
    expect(result.remainingBids).toEqual([
      { orderId: "b1", price: 12, quantity: 6, placedAt: 1 },
    ]);
    expect(result.remainingAsks).toEqual([]);
  });

  it("matches earlier buy order first at equal price", () => {
    const bids: LimitOrder[] = [
      { orderId: "b-late", price: 10, quantity: 2, placedAt: 20 },
      { orderId: "b-early", price: 10, quantity: 2, placedAt: 5 },
    ];
    const asks: LimitOrder[] = [
      { orderId: "a1", price: 10, quantity: 3, placedAt: 1 },
    ];

    const result = match("potions", bids, asks);

    expect(result.fills).toEqual([
      { buyOrderId: "b-early", sellOrderId: "a1", price: 10, quantity: 2 },
      { buyOrderId: "b-late", sellOrderId: "a1", price: 10, quantity: 1 },
    ]);
    expect(result.remainingBids).toEqual([
      { orderId: "b-late", price: 10, quantity: 1, placedAt: 20 },
    ]);
    expect(result.remainingAsks).toEqual([]);
  });

  it("matches earlier sell order first at equal price", () => {
    const bids: LimitOrder[] = [
      { orderId: "b1", price: 10, quantity: 3, placedAt: 1 },
    ];
    const asks: LimitOrder[] = [
      { orderId: "a-late", price: 10, quantity: 2, placedAt: 20 },
      { orderId: "a-early", price: 10, quantity: 2, placedAt: 5 },
    ];

    const result = match("herbs", bids, asks);

    expect(result.fills).toEqual([
      { buyOrderId: "b1", sellOrderId: "a-early", price: 10, quantity: 2 },
      { buyOrderId: "b1", sellOrderId: "a-late", price: 10, quantity: 1 },
    ]);
    expect(result.remainingBids).toEqual([]);
    expect(result.remainingAsks).toEqual([
      { orderId: "a-late", price: 10, quantity: 1, placedAt: 20 },
    ]);
  });

  it("matches best-priced bid before worse-priced bid when one ask crosses both", () => {
    const bids: LimitOrder[] = [
      { orderId: "b-low", price: 12, quantity: 2, placedAt: 2 },
      { orderId: "b-high", price: 15, quantity: 2, placedAt: 1 },
    ];
    const asks: LimitOrder[] = [
      { orderId: "a1", price: 10, quantity: 5, placedAt: 1 },
    ];

    const result = match("scrolls", bids, asks);

    expect(result.fills).toEqual([
      { buyOrderId: "b-high", sellOrderId: "a1", price: 10, quantity: 2 },
      { buyOrderId: "b-low", sellOrderId: "a1", price: 10, quantity: 2 },
    ]);
    expect(result.remainingBids).toEqual([]);
    expect(result.remainingAsks).toEqual([
      { orderId: "a1", price: 10, quantity: 1, placedAt: 1 },
    ]);
  });

  it("matches best-priced ask before worse-priced ask", () => {
    const bids: LimitOrder[] = [
      { orderId: "b1", price: 15, quantity: 5, placedAt: 1 },
    ];
    const asks: LimitOrder[] = [
      { orderId: "a-high", price: 12, quantity: 2, placedAt: 1 },
      { orderId: "a-low", price: 9, quantity: 2, placedAt: 2 },
    ];

    const result = match("ingots", bids, asks);

    expect(result.fills).toEqual([
      { buyOrderId: "b1", sellOrderId: "a-low", price: 9, quantity: 2 },
      { buyOrderId: "b1", sellOrderId: "a-high", price: 12, quantity: 2 },
    ]);
    expect(result.remainingBids).toEqual([
      { orderId: "b1", price: 15, quantity: 1, placedAt: 1 },
    ]);
    expect(result.remainingAsks).toEqual([]);
  });

  it("rejects orders with non-positive quantity", () => {
    const validAsk: LimitOrder = {
      orderId: "a1",
      price: 10,
      quantity: 1,
      placedAt: 1,
    };

    expect(() =>
      match("grain", [{ orderId: "b1", price: 10, quantity: 0, placedAt: 1 }], [
        validAsk,
      ]),
    ).toThrow(/Invalid order quantity/);

    expect(() =>
      match(
        "grain",
        [{ orderId: "b1", price: 10, quantity: 1, placedAt: 1 }],
        [{ orderId: "a1", price: 10, quantity: -1, placedAt: 1 }],
      ),
    ).toThrow(/Invalid order quantity/);
  });

  it("rejects crown as a tradeable resource", () => {
    const order: LimitOrder = {
      orderId: "b1",
      price: 1,
      quantity: 1,
      placedAt: 1,
    };

    expect(() => match("crown" as "grain", [order], [])).toThrow(
      /not tradeable on the market/,
    );
  });

  it("matches each resource book in isolation", () => {
    const bid: LimitOrder = {
      orderId: "b1",
      price: 10,
      quantity: 2,
      placedAt: 1,
    };
    const grainAsk: LimitOrder = {
      orderId: "a-grain",
      price: 9,
      quantity: 2,
      placedAt: 1,
    };
    const lumberAsk: LimitOrder = {
      orderId: "a-lumber",
      price: 9,
      quantity: 2,
      placedAt: 1,
    };

    const grain = match("grain", [bid], [grainAsk]);
    const lumber = match("lumber", [bid], [lumberAsk]);

    expect(grain.fills).toHaveLength(1);
    expect(grain.fills[0]?.sellOrderId).toBe("a-grain");
    expect(lumber.fills).toHaveLength(1);
    expect(lumber.fills[0]?.sellOrderId).toBe("a-lumber");
  });
});
