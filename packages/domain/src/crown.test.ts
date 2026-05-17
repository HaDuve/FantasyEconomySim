import { describe, expect, it } from "vitest";
import { isResourceId, RESOURCE_IDS } from "./resources.js";
import type { WalletCrowns } from "./crown.js";
import type { TickBroadcast } from "./messages.js";

describe("crown", () => {
  it("is currency in the wallet only, not a tradeable resource", () => {
    expect(RESOURCE_IDS).not.toContain("crown");
    expect(isResourceId("crown")).toBe(false);
  });

  it("types wallet balance as WalletCrowns on tick broadcast", () => {
    const balance: WalletCrowns = 100;
    const broadcast: TickBroadcast = {
      kind: "tick",
      tickId: 1,
      walletCrowns: balance,
      inventory: {},
    };
    expect(broadcast.walletCrowns).toBe(100);
  });
});
