import type { ResourceId, WalletCrowns } from "@fantasy-economy-sim/domain";
import { isResourceId } from "@fantasy-economy-sim/domain";
import { eq } from "drizzle-orm";

import type { Db } from "./client.js";
import { inventory, wallets } from "./schema.js";

export type Wallet = typeof wallets.$inferSelect;
export type InventoryRow = typeof inventory.$inferSelect;
export type InventorySnapshot = Partial<Record<ResourceId, number>>;

export async function setWalletCrowns(
  db: Db,
  playerId: string,
  crowns: WalletCrowns,
): Promise<Wallet> {
  const [row] = await db
    .insert(wallets)
    .values({ playerId, crowns })
    .onConflictDoUpdate({
      target: wallets.playerId,
      set: { crowns },
    })
    .returning();

  if (!row) {
    throw new Error("Failed to set wallet crowns");
  }

  return row;
}

export async function getWallet(
  db: Db,
  playerId: string,
): Promise<Wallet | undefined> {
  const [row] = await db
    .select()
    .from(wallets)
    .where(eq(wallets.playerId, playerId))
    .limit(1);

  return row;
}

export async function setInventoryQuantity(
  db: Db,
  playerId: string,
  resourceId: ResourceId,
  quantity: number,
): Promise<InventoryRow> {
  if (!isResourceId(resourceId)) {
    throw new Error(`Unknown resource: ${resourceId}`);
  }

  const [row] = await db
    .insert(inventory)
    .values({ playerId, resourceId, quantity })
    .onConflictDoUpdate({
      target: [inventory.playerId, inventory.resourceId],
      set: { quantity },
    })
    .returning();

  if (!row) {
    throw new Error("Failed to set inventory quantity");
  }

  return row;
}

export async function getInventory(
  db: Db,
  playerId: string,
): Promise<InventorySnapshot> {
  const rows = await db
    .select()
    .from(inventory)
    .where(eq(inventory.playerId, playerId));

  const snapshot: InventorySnapshot = {};

  for (const row of rows) {
    if (isResourceId(row.resourceId)) {
      snapshot[row.resourceId] = row.quantity;
    }
  }

  return snapshot;
}
