import { describe, expect, it, vi } from "vitest";

import { rowsToInventorySnapshot } from "./inventory-snapshot.js";

describe("rowsToInventorySnapshot", () => {
  it("maps known resources into a snapshot", () => {
    expect(
      rowsToInventorySnapshot([
        { resourceId: "grain", quantity: 3 },
        { resourceId: "ore", quantity: 1 },
      ]),
    ).toEqual({ grain: 3, ore: 1 });
  });

  it("omits zero-quantity rows from the snapshot", () => {
    expect(
      rowsToInventorySnapshot([
        { resourceId: "ore", quantity: 0 },
        { resourceId: "ingots", quantity: 1 },
      ]),
    ).toEqual({ ingots: 1 });
  });

  it("omits unknown resource ids and notifies via callback", () => {
    const onUnknownResourceId = vi.fn();

    expect(
      rowsToInventorySnapshot(
        [{ resourceId: "not-a-resource", quantity: 2 }],
        { onUnknownResourceId },
      ),
    ).toEqual({});

    expect(onUnknownResourceId).toHaveBeenCalledWith("not-a-resource");
  });

  it("logs when unknown resource ids are omitted", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    rowsToInventorySnapshot([{ resourceId: "bogus", quantity: 1 }]);

    expect(warn).toHaveBeenCalledWith(
      "inventory row omitted: unknown resource_id=bogus",
    );

    warn.mockRestore();
  });
});
