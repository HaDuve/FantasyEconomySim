import {
  applyAssignmentYield,
  getAssignmentDefinition,
  isPublicBuildingTypeId,
  PUBLIC_BUILDING_FACILITY_FEES,
  WORKER_UPKEEP_PER_TICK,
  type AssignmentId,
  type ResourceId,
} from "@fantasy-economy-sim/domain";
import { and, eq } from "drizzle-orm";

import type { Db, DbExecutor } from "../db/client.js";
import {
  getInventory,
  getInventoryQuantity,
  getWallet,
  lockWalletForUpdate,
  setInventoryQuantity,
  setWalletCrowns,
} from "../db/ledger.js";
import { privateBuildings, workerAssignments, workers } from "../db/schema.js";

export type ProductionTickResult = {
  assignmentsRun: number;
  assignmentsSkipped: number;
  upkeepCharged: number;
  facilityFeesCharged: number;
};

type ActiveAssignment = {
  workerId: string;
  playerId: string;
  assignmentId: AssignmentId;
  privateBuildingId: string | null;
  publicBuildingTypeId: string | null;
  professionId: string;
  privateBuildingTypeId: string | null;
};

async function listActiveAssignments(db: DbExecutor): Promise<ActiveAssignment[]> {
  const rows = await db
    .select({
      workerId: workerAssignments.workerId,
      playerId: workerAssignments.playerId,
      assignmentId: workerAssignments.assignmentId,
      privateBuildingId: workerAssignments.privateBuildingId,
      publicBuildingTypeId: workerAssignments.publicBuildingTypeId,
      professionId: workers.professionId,
      privateBuildingTypeId: privateBuildings.buildingTypeId,
    })
    .from(workerAssignments)
    .innerJoin(workers, eq(workerAssignments.workerId, workers.id))
    .leftJoin(
      privateBuildings,
      eq(workerAssignments.privateBuildingId, privateBuildings.id),
    );

  return rows.map((row) => ({
    ...row,
    assignmentId: row.assignmentId as AssignmentId,
  }));
}

function assignmentCanRun(assignment: ActiveAssignment): boolean {
  const definition = getAssignmentDefinition(assignment.assignmentId);

  if (definition.buildingTypeId === null) {
    return true;
  }

  if (isPublicBuildingTypeId(definition.buildingTypeId)) {
    return assignment.publicBuildingTypeId === definition.buildingTypeId;
  }

  return (
    assignment.privateBuildingTypeId === definition.buildingTypeId &&
    assignment.privateBuildingId !== null
  );
}

async function applyInventoryDelta(
  db: DbExecutor,
  playerId: string,
  delta: Partial<Record<string, number>>,
): Promise<void> {
  for (const [resourceId, change] of Object.entries(delta)) {
    if (change === undefined || change === 0) {
      continue;
    }

    const held = await getInventoryQuantity(
      db,
      playerId,
      resourceId as ResourceId,
    );
    const next = held + change;

    if (next < 0) {
      throw new Error(`Inventory underflow for ${resourceId}`);
    }

    await setInventoryQuantity(db, playerId, resourceId as ResourceId, next);
  }
}

export async function runProductionTick(
  db: Db,
): Promise<ProductionTickResult> {
  return db.transaction(async (tx) => {
    const assignments = await listActiveAssignments(tx);
    let assignmentsRun = 0;
    let assignmentsSkipped = 0;

    for (const assignment of assignments) {
      if (!assignmentCanRun(assignment)) {
        assignmentsSkipped += 1;
        continue;
      }

      const inventorySnapshot = await getInventory(tx, assignment.playerId);
      const delta = applyAssignmentYield(
        assignment.assignmentId,
        inventorySnapshot,
      );

      if (!delta) {
        assignmentsSkipped += 1;
        continue;
      }

      await applyInventoryDelta(tx, assignment.playerId, delta);
      assignmentsRun += 1;
    }

    const workerRows = await tx.select().from(workers);
    const upkeepByPlayer = new Map<string, number>();

    for (const worker of workerRows) {
      upkeepByPlayer.set(
        worker.playerId,
        (upkeepByPlayer.get(worker.playerId) ?? 0) + WORKER_UPKEEP_PER_TICK,
      );
    }

    const facilityByPlayer = new Map<string, number>();

    for (const assignment of assignments) {
      if (
        assignment.publicBuildingTypeId &&
        isPublicBuildingTypeId(assignment.publicBuildingTypeId)
      ) {
        facilityByPlayer.set(
          assignment.playerId,
          PUBLIC_BUILDING_FACILITY_FEES[assignment.publicBuildingTypeId],
        );
      }
    }

    let upkeepCharged = 0;
    let facilityFeesCharged = 0;

    const chargedPlayers = new Set([
      ...upkeepByPlayer.keys(),
      ...facilityByPlayer.keys(),
    ]);

    for (const playerId of chargedPlayers) {
      const upkeep = upkeepByPlayer.get(playerId) ?? 0;
      const facilityFee = facilityByPlayer.get(playerId) ?? 0;
      const totalCharge = upkeep + facilityFee;

      if (totalCharge === 0) {
        continue;
      }

      await lockWalletForUpdate(tx, playerId);
      const wallet = await getWallet(tx, playerId);
      const crowns = wallet?.crowns ?? 0;

      if (crowns < totalCharge) {
        continue;
      }

      await setWalletCrowns(tx, playerId, crowns - totalCharge);
      upkeepCharged += upkeep;
      facilityFeesCharged += facilityFee;
    }

    return {
      assignmentsRun,
      assignmentsSkipped,
      upkeepCharged,
      facilityFeesCharged,
    };
  });
}
