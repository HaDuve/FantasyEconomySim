import type { InventorySnapshot } from "@fantasy-economy-sim/domain";
import { isResourceId } from "@fantasy-economy-sim/domain";

export type InventoryRowLike = {
  resourceId: string;
  quantity: number;
};

export type InventorySnapshotOptions = {
  onUnknownResourceId?: (resourceId: string) => void;
};

export function rowsToInventorySnapshot(
  rows: readonly InventoryRowLike[],
  options: InventorySnapshotOptions = {},
): InventorySnapshot {
  const onUnknown =
    options.onUnknownResourceId ??
    ((resourceId: string) => {
      console.warn(`inventory row omitted: unknown resource_id=${resourceId}`);
    });

  const snapshot: InventorySnapshot = {};

  for (const row of rows) {
    if (isResourceId(row.resourceId)) {
      snapshot[row.resourceId] = row.quantity;
    } else {
      onUnknown(row.resourceId);
    }
  }

  return snapshot;
}
