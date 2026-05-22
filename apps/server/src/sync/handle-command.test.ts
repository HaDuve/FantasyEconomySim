import { describe, expect, it } from "vitest";

import { parseClientCommand } from "./handle-command.js";

describe("parseClientCommand", () => {
  it("rejects payloads without a kind", () => {
    expect(parseClientCommand({ resourceId: "grain" })).toEqual({
      ok: false,
      commandKind: "unknown",
      code: "invalid_command",
    });
  });

  it("rejects place_order missing side, price, and quantity", () => {
    expect(
      parseClientCommand({ kind: "place_order", resourceId: "grain" }),
    ).toEqual({
      ok: false,
      commandKind: "place_order",
      code: "invalid_command",
    });
  });

  it("accepts a well-formed place_order", () => {
    expect(
      parseClientCommand({
        kind: "place_order",
        resourceId: "grain",
        side: "buy",
        price: 5,
        quantity: 2,
      }),
    ).toEqual({
      ok: true,
      command: {
        kind: "place_order",
        resourceId: "grain",
        side: "buy",
        price: 5,
        quantity: 2,
      },
    });
  });

  it("rejects cancel_order without orderId", () => {
    expect(parseClientCommand({ kind: "cancel_order" })).toEqual({
      ok: false,
      commandKind: "cancel_order",
      code: "invalid_command",
    });
  });

  it("rejects set_assignment with non-UUID workerId", () => {
    expect(
      parseClientCommand({
        kind: "set_assignment",
        workerId: "not-a-uuid",
        assignmentId: "hunt_game",
      }),
    ).toEqual({
      ok: false,
      commandKind: "set_assignment",
      code: "invalid_command",
    });
  });

  it("rejects pool_buy with non-integer quantity", () => {
    expect(
      parseClientCommand({
        kind: "pool_buy",
        resourceId: "grain",
        quantity: 1.5,
      }),
    ).toEqual({
      ok: false,
      commandKind: "pool_buy",
      code: "invalid_command",
    });
  });
});
