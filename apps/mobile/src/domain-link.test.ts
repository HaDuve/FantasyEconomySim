import { describe, expect, it } from "vitest";
import { RESOURCE_IDS, STARTER_TRIO_PROFESSION_IDS } from "@fantasy-economy-sim/domain";

describe("mobile domain link", () => {
  it("uses shared resource and profession catalog from workspace domain", () => {
    expect(RESOURCE_IDS).toHaveLength(8);
    expect(STARTER_TRIO_PROFESSION_IDS).toHaveLength(3);
  });
});
