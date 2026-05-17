import { describe, expect, it } from "vitest";
import { RESOURCE_IDS } from "./resources.js";

describe("resource catalog", () => {
  it("lists all eight tradeable resources for the market", () => {
    expect(RESOURCE_IDS).toHaveLength(8);
    expect([...RESOURCE_IDS].sort()).toEqual([
      "game",
      "grain",
      "herbs",
      "ingots",
      "lumber",
      "ore",
      "potions",
      "scrolls",
    ]);
  });
});
