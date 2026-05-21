import { formatCommandError } from "./format-command-error";

describe("formatCommandError", () => {
  it("formats command kind and error code for display", () => {
    expect(
      formatCommandError({
        kind: "command_error",
        commandKind: "place_order",
        code: "insufficient_crowns",
      }),
    ).toBe("place_order: insufficient_crowns");
  });
});
