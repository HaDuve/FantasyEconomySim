import { canPlaceOrderNow, PLACE_ORDER_COOLDOWN_MS } from "./place-order-cooldown";

describe("canPlaceOrderNow", () => {
  it("allows the first place order", () => {
    expect(canPlaceOrderNow(null, 1000)).toBe(true);
  });

  it("blocks a second place order inside the cooldown window", () => {
    const last = 1000;
    expect(canPlaceOrderNow(last, last + PLACE_ORDER_COOLDOWN_MS - 1)).toBe(false);
    expect(canPlaceOrderNow(last, last + PLACE_ORDER_COOLDOWN_MS)).toBe(true);
  });
});
