import {
  applyAssignmentYield,
  getAssignmentDefinition,
  isPublicBuildingTypeId,
  PUBLIC_BUILDING_FACILITY_FEES,
  WORKER_UPKEEP_PER_TICK,
  type AssignmentId,
  type ResourceId,
} from "@fantasy-economy-sim/domain";
import { asc, eq } from "drizzle-orm";

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

type WorkerRow = typeof workers.$inferSelect;

/**
 * Stable per-tick order: player, then worker. Conversions use inventory held
 * when each assignment runs (no same-tick chaining guarantee across workers).
 */
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
    )
    .orderBy(asc(workerAssignments.playerId), asc(workerAssignments.workerId));

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

function publicFacilityFee(
  publicBuildingTypeId: string | null,
): number | null {
  if (
    publicBuildingTypeId &&
    isPublicBuildingTypeId(publicBuildingTypeId)
  ) {
    return PUBLIC_BUILDING_FACILITY_FEES[publicBuildingTypeId];
  }

  return null;
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

async function debitCrowns(
  db: DbExecutor,
  playerId: string,
  amount: number,
): Promise<number> {
  if (amount <= 0) {
    return 0;
  }

  await lockWalletForUpdate(db, playerId);
  const wallet = await getWallet(db, playerId);
  const crowns = wallet?.crowns ?? 0;

  if (crowns < amount) {
    return 0;
  }

  await setWalletCrowns(db, playerId, crowns - amount);
  return amount;
}

function groupWorkersByPlayer(
  workerRows: WorkerRow[],
): Map<string, WorkerRow[]> {
  const byPlayer = new Map<string, WorkerRow[]>();

  for (const worker of workerRows) {
    const list = byPlayer.get(worker.playerId) ?? [];
    list.push(worker);
    byPlayer.set(worker.playerId, list);
  }

  for (const list of byPlayer.values()) {
    list.sort((a, b) => a.id.localeCompare(b.id));
  }

  return byPlayer;
}

async function chargeUpkeepPerWorker(
  db: DbExecutor,
  workerRows: WorkerRow[],
): Promise<number> {
  let upkeepCharged = 0;

  for (const [playerId, playerWorkers] of groupWorkersByPlayer(workerRows)) {
    await lockWalletForUpdate(db, playerId);
    const wallet = await getWallet(db, playerId);
    let crowns = wallet?.crowns ?? 0;

    for (const _worker of playerWorkers) {
      if (crowns < WORKER_UPKEEP_PER_TICK) {
        continue;
      }

      crowns -= WORKER_UPKEEP_PER_TICK;
      upkeepCharged += WORKER_UPKEEP_PER_TICK;
    }

    await setWalletCrowns(db, playerId, crowns);
  }

  return upkeepCharged;
}

export async function runProductionTick(
  db: Db,
): Promise<ProductionTickResult> {
  return db.transaction(async (tx) => {
    const assignments = await listActiveAssignments(tx);
    let assignmentsRun = 0;
    let assignmentsSkipped = 0;
    let facilityFeesCharged = 0;

    for (const assignment of assignments) {
      if (!assignmentCanRun(assignment)) {
        assignmentsSkipped += 1;
        continue;
      }

      const facilityFee = publicFacilityFee(assignment.publicBuildingTypeId);

      if (facilityFee !== null) {
        const paid = await debitCrowns(tx, assignment.playerId, facilityFee);

        if (paid === 0) {
          assignmentsSkipped += 1;
          continue;
        }

        facilityFeesCharged += paid;
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

    const workerRows = await tx
      .select()
      .from(workers)
      .orderBy(asc(workers.playerId), asc(workers.id));
    const upkeepCharged = await chargeUpkeepPerWorker(tx, workerRows);

    return {
      assignmentsRun,
      assignmentsSkipped,
      upkeepCharged,
      facilityFeesCharged,
    };
  });
}
