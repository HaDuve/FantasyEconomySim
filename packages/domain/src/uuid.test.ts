import { describe, expect, it } from "vitest";

import { isUuid } from "./uuid.js";

describe("isUuid", () => {
  it("rejects empty string", () => {
    expect(isUuid("")).toBe(false);
  });

  it("rejects non-UUID garbage", () => {
    expect(isUuid("not-a-uuid")).toBe(false);
  });

  it("accepts canonical hyphenated lowercase UUID", () => {
    expect(isUuid("00000000-0000-4000-8000-000000000001")).toBe(true);
  });

  it("accepts canonical hyphenated uppercase UUID", () => {
    expect(isUuid("00000000-0000-4000-8000-000000000099".toUpperCase())).toBe(
      true,
    );
  });
});
