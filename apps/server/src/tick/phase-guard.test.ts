import { describe, expect, it } from "vitest";

import { PhaseGuard, TickPhaseOrderError } from "./phase-guard.js";

describe("PhaseGuard", () => {
  it("rejects production after tick auction", () => {
    const guard = new PhaseGuard();

    guard.enter("worldDrip");
    guard.enter("tickAuction");

    expect(() => guard.enter("production")).toThrow(TickPhaseOrderError);
  });
});
