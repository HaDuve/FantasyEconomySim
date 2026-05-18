import {
  getAssignmentDefinition,
  isAssignmentId,
  isPublicBuildingTypeId,
  type AssignmentId,
  type PublicBuildingTypeId,
} from "@fantasy-economy-sim/domain";
import { and, eq } from "drizzle-orm";

import type { Db, DbExecutor } from "../db/client.js";
import { privateBuildings, workerAssignments, workers } from "../db/schema.js";
import { getPrivateBuilding } from "./buildings.js";
import {
  BuildingNotOwnedError,
  IncompatibleAssignmentError,
  PublicBuildingSeatCapError,
  WorkerNotOwnedError,
} from "./errors.js";

export type WorkerAssignment = typeof workerAssignments.$inferSelect;

export async function setAssignment(
  db: Db,
  playerId: string,
  workerId: string,
  assignmentId: AssignmentId,
  buildingId?: string,
): Promise<WorkerAssignment> {
  if (!isAssignmentId(assignmentId)) {
    throw new Error(`Unknown assignment: ${assignmentId}`);
  }

  const definition = getAssignmentDefinition(assignmentId);

  return db.transaction(async (tx) => {
    const [worker] = await tx
      .select()
      .from(workers)
      .where(and(eq(workers.id, workerId), eq(workers.playerId, playerId)))
      .limit(1);

    if (!worker) {
      throw new WorkerNotOwnedError();
    }

    if (worker.professionId !== definition.professionId) {
      throw new IncompatibleAssignmentError();
    }

    let privateBuildingId: string | null = null;
    let publicBuildingTypeId: PublicBuildingTypeId | null = null;

    if (definition.buildingTypeId === null) {
      if (buildingId !== undefined) {
        throw new IncompatibleAssignmentError();
      }
    } else if (isPublicBuildingTypeId(definition.buildingTypeId)) {
      if (buildingId !== undefined) {
        throw new IncompatibleAssignmentError();
      }

      publicBuildingTypeId = definition.buildingTypeId;

      const [existingSeat] = await tx
        .select({ workerId: workerAssignments.workerId })
        .from(workerAssignments)
        .where(
          and(
            eq(workerAssignments.playerId, playerId),
            eq(
              workerAssignments.publicBuildingTypeId,
              publicBuildingTypeId,
            ),
          ),
        )
        .limit(1);

      if (existingSeat && existingSeat.workerId !== workerId) {
        throw new PublicBuildingSeatCapError();
      }
    } else {
      if (!buildingId) {
        throw new IncompatibleAssignmentError();
      }

      const building = await getPrivateBuilding(tx, playerId, buildingId);

      if (!building || building.buildingTypeId !== definition.buildingTypeId) {
        throw new BuildingNotOwnedError();
      }

      privateBuildingId = building.id;
    }

    const [row] = await tx
      .insert(workerAssignments)
      .values({
        workerId,
        playerId,
        assignmentId,
        privateBuildingId,
        publicBuildingTypeId,
      })
      .onConflictDoUpdate({
        target: workerAssignments.workerId,
        set: {
          assignmentId,
          privateBuildingId,
          publicBuildingTypeId,
        },
      })
      .returning();

    if (!row) {
      throw new Error("Failed to set assignment");
    }

    return row;
  });
}

export async function getWorkerAssignments(
  db: DbExecutor,
  playerId: string,
): Promise<WorkerAssignment[]> {
  return db
    .select()
    .from(workerAssignments)
    .where(eq(workerAssignments.playerId, playerId));
}
