import { describe, expect, it } from "vitest";
import { applyAssignmentYield } from "./production.js";

describe("applyAssignmentYield", () => {
  it("yields game for Hunter field work without consuming inputs", () => {
    const result = applyAssignmentYield("hunt_game", {});

    expect(result).toEqual({ game: 1 });
  });

  it("consumes ore and yields ingots for Smith conversion when inputs are available", () => {
    const result = applyAssignmentYield("smith_ingots", { ore: 2 });

    expect(result).toEqual({ ore: -2, ingots: 1 });
  });

  it("skips Smith conversion when ore inputs are insufficient", () => {
    expect(applyAssignmentYield("smith_ingots", { ore: 1 })).toBeNull();
  });
});
