import {
  getPrivateBuildingCost,
  isPrivateBuildingTypeId,
  type PrivateBuildingTypeId,
} from "@fantasy-economy-sim/domain";
import { and, eq } from "drizzle-orm";

import type { Db, DbExecutor } from "../db/client.js";
import {
  getWallet,
  lockWalletForUpdate,
  setWalletCrowns,
} from "../db/ledger.js";
import { privateBuildings } from "../db/schema.js";
import { InsufficientCrownsForBuildingError } from "./errors.js";

export type PrivateBuilding = typeof privateBuildings.$inferSelect;

export async function purchasePrivateBuilding(
  db: Db,
  playerId: string,
  buildingTypeId: PrivateBuildingTypeId,
): Promise<PrivateBuilding> {
  if (!isPrivateBuildingTypeId(buildingTypeId)) {
    throw new Error(`Unknown private building: ${buildingTypeId}`);
  }

  const cost = getPrivateBuildingCost(buildingTypeId);

  return db.transaction(async (tx) => {
    await lockWalletForUpdate(tx, playerId);
    const wallet = await getWallet(tx, playerId);
    const crowns = wallet?.crowns ?? 0;

    if (crowns < cost) {
      throw new InsufficientCrownsForBuildingError();
    }

    await setWalletCrowns(tx, playerId, crowns - cost);

    const [row] = await tx
      .insert(privateBuildings)
      .values({ playerId, buildingTypeId })
      .returning();

    if (!row) {
      throw new Error("Failed to purchase private building");
    }

    return row;
  });
}

export async function getPrivateBuildings(
  db: DbExecutor,
  playerId: string,
): Promise<PrivateBuilding[]> {
  return db
    .select()
    .from(privateBuildings)
    .where(eq(privateBuildings.playerId, playerId));
}

export async function getPrivateBuilding(
  db: DbExecutor,
  playerId: string,
  buildingId: string,
): Promise<PrivateBuilding | undefined> {
  const [row] = await db
    .select()
    .from(privateBuildings)
    .where(
      and(
        eq(privateBuildings.id, buildingId),
        eq(privateBuildings.playerId, playerId),
      ),
    )
    .limit(1);

  return row;
}
