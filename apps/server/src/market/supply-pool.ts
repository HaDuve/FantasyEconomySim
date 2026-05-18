import {
  applyWorldDrip,
  getPoolPrice,
  isPoolResourceId,
  POOL_RESOURCE_IDS,
  type PoolResourceId,
  type ResourceId,
  type SupplyPoolSnapshot,
} from "@fantasy-economy-sim/domain";
import { asc, eq } from "drizzle-orm";

import type { Db, DbExecutor } from "../db/client.js";
import {
  getInventoryQuantity,
  getWallet,
  lockInventoryForUpdate,
  lockWalletForUpdate,
  setInventoryQuantity,
  setWalletCrowns,
} from "../db/ledger.js";
import { supplyPool } from "../db/schema.js";
import {
  EmptySupplyPoolError,
  InsufficientCrownsError,
  NotPoolResourceError,
} from "./errors.js";
import { runTickAuction, type TickAuctionResult } from "./tick-auction.js";

export type GlobalTickResult = TickAuctionResult;

function rowsToSupplyPoolSnapshot(
  rows: (typeof supplyPool.$inferSelect)[],
): SupplyPoolSnapshot {
  const snapshot = {} as SupplyPoolSnapshot;

  for (const resourceId of POOL_RESOURCE_IDS) {
    const row = rows.find((entry) => entry.resourceId === resourceId);
    snapshot[resourceId] = row?.quantity ?? 0;
  }

  return snapshot;
}

export async function getSupplyPool(db: DbExecutor): Promise<SupplyPoolSnapshot> {
  const rows = await db.select().from(supplyPool);

  return rowsToSupplyPoolSnapshot(rows);
}

async function setSupplyPoolQuantity(
  db: DbExecutor,
  resourceId: PoolResourceId,
  quantity: number,
): Promise<void> {
  await db
    .update(supplyPool)
    .set({ quantity })
    .where(eq(supplyPool.resourceId, resourceId));
}

async function lockSupplyPoolForUpdate(db: DbExecutor): Promise<void> {
  await db
    .select()
    .from(supplyPool)
    .orderBy(asc(supplyPool.resourceId))
    .for("update");
}

export async function runWorldDrip(db: Db): Promise<SupplyPoolSnapshot> {
  return db.transaction(async (tx) => {
    await lockSupplyPoolForUpdate(tx);
    const current = await getSupplyPool(tx);
    const next = applyWorldDrip(current);

    for (const resourceId of POOL_RESOURCE_IDS) {
      await setSupplyPoolQuantity(tx, resourceId, next[resourceId]);
    }

    return next;
  });
}

export async function poolBuy(
  db: Db,
  playerId: string,
  resourceId: ResourceId,
  quantity: number,
): Promise<void> {
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new Error(`Invalid pool buy quantity: ${quantity}`);
  }

  if (!isPoolResourceId(resourceId)) {
    throw new NotPoolResourceError();
  }

  const unitPrice = getPoolPrice(resourceId);
  const totalCost = unitPrice * quantity;

  await db.transaction(async (tx) => {
    await lockWalletForUpdate(tx, playerId);
    await lockInventoryForUpdate(tx, playerId, resourceId);

    await lockSupplyPoolForUpdate(tx);
    const poolRows = await tx
      .select()
      .from(supplyPool)
      .where(eq(supplyPool.resourceId, resourceId))
      .limit(1);
    const poolHeld = poolRows[0]?.quantity ?? 0;

    if (poolHeld < quantity) {
      throw new EmptySupplyPoolError();
    }

    const wallet = await getWallet(tx, playerId);
    const crowns = wallet?.crowns ?? 0;

    if (crowns < totalCost) {
      throw new InsufficientCrownsError("Insufficient crowns for pool buy");
    }

    const held = await getInventoryQuantity(tx, playerId, resourceId);

    await setWalletCrowns(tx, playerId, crowns - totalCost);
    await setInventoryQuantity(tx, playerId, resourceId, held + quantity);
    await setSupplyPoolQuantity(tx, resourceId, poolHeld - quantity);
  });
}

/** Manual **global tick** path: **world drip** then **tick auction**. */
export async function runGlobalTick(db: Db): Promise<GlobalTickResult> {
  await runWorldDrip(db);
  return runTickAuction(db);
}
