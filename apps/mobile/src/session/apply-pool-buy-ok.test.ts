import { applyPoolBuyOk, initialHudState } from "./hud-state";

describe("applyPoolBuyOk", () => {
  it("debits wallet and credits inventory immediately after a successful pool buy", () => {
    const state = {
      ...initialHudState(),
      walletCrowns: 100,
      inventory: { grain: 1 },
    };

    const next = applyPoolBuyOk(state, { resourceId: "grain", quantity: 2 });

    expect(next.walletCrowns).toBe(94);
    expect(next.inventory).toEqual({ grain: 3 });
    expect(next.errorMessage).toBeNull();
  });
});
