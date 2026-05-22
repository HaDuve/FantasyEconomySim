import { applyConnectGuest, initialHudState } from "./hud-state";

describe("applyConnectGuest", () => {
  it("shows wallet, inventory, and starter worker after connect grants the package", () => {
    const next = applyConnectGuest(initialHudState(), {
      playerId: "p1",
      crowns: 100,
      inventory: {},
      workers: [{ id: "w1", profession: "hunter" }],
      privateBuildings: [],
      starterPackageGranted: true,
    });

    expect(next.walletCrowns).toBe(100);
    expect(next.inventory).toEqual({});
    expect(next.workers).toEqual([{ id: "w1", profession: "hunter" }]);
  });
});
