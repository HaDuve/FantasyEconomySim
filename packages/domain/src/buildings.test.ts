import { describe, expect, it } from "vitest";
import {
  getPrivateBuildingCost,
  isPrivateBuildingTypeId,
  PRIVATE_BUILDING_COSTS,
} from "./buildings.js";

describe("private buildings", () => {
  it("exposes v1 purchase costs from the domain glossary", () => {
    expect(PRIVATE_BUILDING_COSTS).toEqual({
      herbalist_shop: 80,
      mine: 80,
      mill: 100,
      sawmill: 100,
      smithy: 150,
      alchemy: 150,
    });
  });

  it("returns crown cost for a private building type", () => {
    expect(getPrivateBuildingCost("mine")).toBe(80);
    expect(isPrivateBuildingTypeId("mine")).toBe(true);
    expect(isPrivateBuildingTypeId("magic_school")).toBe(false);
  });
});
