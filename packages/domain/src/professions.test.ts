import { describe, expect, it } from "vitest";
import {
  STARTER_TRIO_PROFESSION_IDS,
  type ProfessionId,
} from "./professions.js";

describe("starter trio", () => {
  it("offers Hunter, Miner, and Herbalist at onboarding", () => {
    expect(STARTER_TRIO_PROFESSION_IDS).toEqual([
      "hunter",
      "miner",
      "herbalist",
    ]);
  });

  it("limits ProfessionId to the starter trio in v1", () => {
    const professions: ProfessionId[] = [...STARTER_TRIO_PROFESSION_IDS];
    expect(professions).toHaveLength(3);
  });
});
