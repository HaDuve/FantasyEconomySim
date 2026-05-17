import { describe, expect, it } from "vitest";
import { CONVERSION_RECIPES } from "./recipes.js";

describe("conversion recipes", () => {
  it("matches v1 conversion table from domain glossary", () => {
    expect(CONVERSION_RECIPES).toEqual({
      ingots: { inputs: { ore: 2 }, outputPerGlobalTick: 1 },
      potions: { inputs: { herbs: 2, grain: 1 }, outputPerGlobalTick: 1 },
      scrolls: {
        inputs: { ingots: 1, potions: 1, lumber: 1 },
        outputPerGlobalTick: 1,
      },
    });
  });
});
