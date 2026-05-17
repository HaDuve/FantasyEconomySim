import { describe, expect, it } from "vitest";
import { isResourceId, RESOURCE_IDS } from "./resources.js";
import {
  assertWalletCrowns,
  isWalletCrowns,
  toWalletCrowns,
  type WalletCrowns,
} from "./crown.js";
import type { TickBroadcast } from "./messages.js";

describe("crown", () => {
  it("is currency in the wallet only, not a tradeable resource", () => {
    expect(RESOURCE_IDS).not.toContain("crown");
    expect(isResourceId("crown")).toBe(false);
  });

  it("accepts non-negative integer crown balances", () => {
    expect(isWalletCrowns(0)).toBe(true);
    expect(isWalletCrowns(100)).toBe(true);
    expect(toWalletCrowns(100)).toBe(100);
  });

  it("rejects invalid crown balances", () => {
    expect(isWalletCrowns(-1)).toBe(false);
    expect(isWalletCrowns(1.5)).toBe(false);
    expect(isWalletCrowns(Number.NaN)).toBe(false);
    expect(() => assertWalletCrowns(-1)).toThrow(/Invalid wallet crowns/);
    expect(() => toWalletCrowns(1.5)).toThrow(/Invalid wallet crowns/);
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
