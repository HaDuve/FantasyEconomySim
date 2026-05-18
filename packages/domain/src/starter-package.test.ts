import { describe, expect, it } from "vitest";

import { STARTER_PACKAGE_CROWNS } from "./starter-package.js";

describe("starter package", () => {
  it("grants 100 crowns on first connect", () => {
    expect(STARTER_PACKAGE_CROWNS).toBe(100);
  });
});
