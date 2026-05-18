import type { InventorySnapshot } from "./messages.js";
import {
  applyConversion,
  type AssignmentId,
  getAssignmentDefinition,
} from "./assignments.js";

/** Inventory delta from one **assignment** on a **global tick** (v1: unit yields). */
export type AssignmentYieldDelta = Partial<Record<string, number>>;

function mergeInventory(
  inventory: InventorySnapshot,
  delta: AssignmentYieldDelta,
): InventorySnapshot {
  const next = { ...inventory };

  for (const [resourceId, change] of Object.entries(delta)) {
    if (change === undefined) {
      continue;
    }

    const current = next[resourceId as keyof InventorySnapshot] ?? 0;
    const updated = current + change;

    if (updated <= 0) {
      delete next[resourceId as keyof InventorySnapshot];
    } else {
      next[resourceId as keyof InventorySnapshot] = updated;
    }
  }

  return next;
}

/**
 * Resolves one **assignment** yield for a **global tick**.
 * Returns `null` when the **assignment** cannot run (e.g. missing **conversion** inputs).
 */
export function applyAssignmentYield(
  assignmentId: AssignmentId,
  inventory: InventorySnapshot,
): AssignmentYieldDelta | null {
  const definition = getAssignmentDefinition(assignmentId);

  if (definition.conversionOutputId) {
    return applyConversion(definition.conversionOutputId, inventory);
  }

  return { [definition.outputResourceId]: definition.yieldPerGlobalTick };
}

export function applyAssignmentYieldToInventory(
  assignmentId: AssignmentId,
  inventory: InventorySnapshot,
): InventorySnapshot | null {
  const delta = applyAssignmentYield(assignmentId, inventory);

  if (!delta) {
    return null;
  }

  return mergeInventory(inventory, delta);
}
