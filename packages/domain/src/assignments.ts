import type { PrivateBuildingTypeId, PublicBuildingTypeId } from "./buildings.js";
import type { ProfessionId } from "./professions.js";
import { CONVERSION_RECIPES, type ConversionOutputId } from "./recipes.js";
import type { ResourceId } from "./resources.js";
import type { InventorySnapshot } from "./messages.js";
import type { AssignmentYieldDelta } from "./production.js";

export const ASSIGNMENT_IDS = [
  "hunt_game",
  "mine_ore",
  "gather_herbs",
  "mill_grain",
  "saw_lumber",
  "smith_ingots",
  "brew_potions",
  "scribe_scrolls",
] as const;

export type AssignmentId = (typeof ASSIGNMENT_IDS)[number];

export type AssignmentDefinition = {
  id: AssignmentId;
  professionId: ProfessionId;
  /** `null` = **field work** (no **building**). */
  buildingTypeId: PrivateBuildingTypeId | PublicBuildingTypeId | null;
  outputResourceId: ResourceId;
  conversionOutputId?: ConversionOutputId;
  yieldPerGlobalTick: number;
};

export const ASSIGNMENT_DEFINITIONS: Record<AssignmentId, AssignmentDefinition> =
  {
    hunt_game: {
      id: "hunt_game",
      professionId: "hunter",
      buildingTypeId: null,
      outputResourceId: "game",
      yieldPerGlobalTick: 1,
    },
    mine_ore: {
      id: "mine_ore",
      professionId: "miner",
      buildingTypeId: "mine",
      outputResourceId: "ore",
      yieldPerGlobalTick: 1,
    },
    gather_herbs: {
      id: "gather_herbs",
      professionId: "herbalist",
      buildingTypeId: "herbalist_shop",
      outputResourceId: "herbs",
      yieldPerGlobalTick: 1,
    },
    mill_grain: {
      id: "mill_grain",
      professionId: "miller",
      buildingTypeId: "mill",
      outputResourceId: "grain",
      yieldPerGlobalTick: 1,
    },
    saw_lumber: {
      id: "saw_lumber",
      professionId: "sawyer",
      buildingTypeId: "sawmill",
      outputResourceId: "lumber",
      yieldPerGlobalTick: 1,
    },
    smith_ingots: {
      id: "smith_ingots",
      professionId: "smith",
      buildingTypeId: "smithy",
      outputResourceId: "ingots",
      conversionOutputId: "ingots",
      yieldPerGlobalTick: 1,
    },
    brew_potions: {
      id: "brew_potions",
      professionId: "alchemist",
      buildingTypeId: "alchemy",
      outputResourceId: "potions",
      conversionOutputId: "potions",
      yieldPerGlobalTick: 1,
    },
    scribe_scrolls: {
      id: "scribe_scrolls",
      professionId: "scholar",
      buildingTypeId: "magic_school",
      outputResourceId: "scrolls",
      conversionOutputId: "scrolls",
      yieldPerGlobalTick: 1,
    },
  };

export function isAssignmentId(value: unknown): value is AssignmentId {
  return (
    typeof value === "string" &&
    (ASSIGNMENT_IDS as readonly string[]).includes(value)
  );
}

export function getAssignmentDefinition(
  assignmentId: AssignmentId,
): AssignmentDefinition {
  return ASSIGNMENT_DEFINITIONS[assignmentId];
}

/** Applies a **conversion** **assignment** when inputs are available (same **global tick**). */
export function applyConversion(
  conversionOutputId: ConversionOutputId,
  inventory: InventorySnapshot,
): AssignmentYieldDelta | null {
  const recipe = CONVERSION_RECIPES[conversionOutputId];
  const delta: AssignmentYieldDelta = {
    [conversionOutputId]: recipe.outputPerGlobalTick,
  };

  for (const [resourceId, required] of Object.entries(recipe.inputs)) {
    const held = inventory[resourceId as ResourceId] ?? 0;

    if (held < required) {
      return null;
    }

    delta[resourceId] = (delta[resourceId] ?? 0) - required;
  }

  return delta;
}
