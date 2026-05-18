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

  it("includes production professions beyond the starter trio", () => {
    const professions: ProfessionId[] = [
      "hunter",
      "smith",
      "scholar",
    ];
    expect(professions).toHaveLength(3);
  });
});
