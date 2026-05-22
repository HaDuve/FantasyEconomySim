import {
  ASSIGNMENT_DEFINITIONS,
  getPrivateBuildingCost,
  PUBLIC_BUILDING_FACILITY_FEES,
  type AssignmentId,
  type PrivateBuildingTypeId,
  type StarterTrioProfessionId,
} from "@fantasy-economy-sim/domain";

import type { HudPrivateBuilding, HudWorker } from "../session/hud-state";

export type SetAssignmentInput = {
  workerId: string;
  assignmentId: AssignmentId;
  buildingId?: string;
};

const STARTER_BUILDING_BY_PROFESSION: Partial<
  Record<StarterTrioProfessionId, PrivateBuildingTypeId>
> = {
  miner: "mine",
  herbalist: "herbalist_shop",
};

const STARTER_ASSIGNMENT_BY_PROFESSION: Record<StarterTrioProfessionId, AssignmentId> =
  {
    hunter: "hunt_game",
    miner: "mine_ore",
    herbalist: "gather_herbs",
  };

export function starterPrivateBuildingType(
  profession: StarterTrioProfessionId,
): PrivateBuildingTypeId | undefined {
  return STARTER_BUILDING_BY_PROFESSION[profession];
}

export function starterPrivateBuildingCost(
  profession: StarterTrioProfessionId,
): number | undefined {
  const buildingTypeId = starterPrivateBuildingType(profession);
  return buildingTypeId ? getPrivateBuildingCost(buildingTypeId) : undefined;
}

/**
 * Starter HUD only exposes set-assignment when prerequisites are met (e.g. mine
 * owned before mine_ore). Invalid set_assignment without a building is validated
 * on the server — see sync-gateway integration tests; manual QA uses dev routes
 * or WebSocket commands, not the Production panel button.
 */
export function buildStarterSetAssignment(
  worker: HudWorker,
  privateBuildings: HudPrivateBuilding[],
): SetAssignmentInput | undefined {
  const assignmentId = STARTER_ASSIGNMENT_BY_PROFESSION[worker.profession];
  const definition = ASSIGNMENT_DEFINITIONS[assignmentId];

  if (definition.buildingTypeId === null) {
    return { workerId: worker.id, assignmentId };
  }

  const building = privateBuildings.find(
    (row) => row.buildingTypeId === definition.buildingTypeId,
  );

  if (!building) {
    return undefined;
  }

  return {
    workerId: worker.id,
    assignmentId,
    buildingId: building.id,
  };
}

export function facilityFeeForAssignment(assignmentId: AssignmentId): number | null {
  const definition = ASSIGNMENT_DEFINITIONS[assignmentId];

  if (definition.buildingTypeId === "magic_school") {
    return PUBLIC_BUILDING_FACILITY_FEES.magic_school;
  }

  return null;
}
