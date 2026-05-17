import { describe, expect, it } from "vitest";
import { isResourceId, RESOURCE_IDS } from "./resources.js";

describe("crown", () => {
  it("is currency in the wallet only, not a tradeable resource", () => {
    expect(RESOURCE_IDS).not.toContain("crown");
    expect(isResourceId("crown")).toBe(false);
  });
});
