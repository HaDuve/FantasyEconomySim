import { describe, expect, it } from "vitest";
import { CONVERSION_RECIPES } from "./recipes.js";

describe("conversion recipes", () => {
  it("matches v1 conversion table from domain glossary", () => {
    expect(CONVERSION_RECIPES).toEqual({
      ingots: { ore: 2 },
      potions: { herbs: 2, grain: 1 },
      scrolls: { ingots: 1, potions: 1, lumber: 1 },
    });
  });
});
