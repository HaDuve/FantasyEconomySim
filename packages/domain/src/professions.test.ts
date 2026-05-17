import { describe, expect, it } from "vitest";
import { STARTER_TRIO_PROFESSION_IDS } from "./professions.js";

describe("starter trio", () => {
  it("offers Hunter, Miner, and Herbalist at onboarding", () => {
    expect(STARTER_TRIO_PROFESSION_IDS).toEqual([
      "hunter",
      "miner",
      "herbalist",
    ]);
  });
});
