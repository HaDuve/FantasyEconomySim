import type {
  InventorySnapshot,
  ResourceId,
  WalletCrowns,
} from "@fantasy-economy-sim/domain";
import {
  assertWalletCrowns,
  isResourceId,
  RESOURCE_IDS,
  toWalletCrowns,
} from "@fantasy-economy-sim/domain";
import { and, eq } from "drizzle-orm";

import type { Db, DbExecutor } from "./client.js";
import { rowsToInventorySnapshot } from "./inventory-snapshot.js";
import { registerPlayer } from "./players.js";
import { inventory, wallets } from "./schema.js";

export type Wallet = typeof wallets.$inferSelect;
export type InventoryRow = typeof inventory.$inferSelect;
export type CreatePlayerLedgerInput = {
  firebaseUid?: string | null;
  crowns?: WalletCrowns;
  inventory?: Partial<Record<ResourceId, number>>;
};

export type CreatePlayerLedgerResult = {
  playerId: string;
  crowns: WalletCrowns;
  inventory: InventorySnapshot;
};

export async function createPlayerWithLedger(
  db: Db,
  input: CreatePlayerLedgerInput = {},
): Promise<CreatePlayerLedgerResult> {
  const crowns = toWalletCrowns(input.crowns ?? 0);
  const inventoryInput = input.inventory ?? {};

  return db.transaction(async (tx) => {
    const player = await registerPlayer(tx, {
      firebaseUid: input.firebaseUid ?? null,
    });

    await setWalletCrowns(tx, player.id, crowns);

    for (const resourceId of RESOURCE_IDS) {
      const quantity = inventoryInput[resourceId];
      if (quantity !== undefined) {
        await setInventoryQuantity(tx, player.id, resourceId, quantity);
      }
    }

    return {
      playerId: player.id,
      crowns,
      inventory: await getInventory(tx, player.id),
    };
  });
}

export async function setWalletCrowns(
  db: DbExecutor,
  playerId: string,
  crowns: WalletCrowns,
): Promise<Wallet> {
  assertWalletCrowns(crowns);

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
  db: DbExecutor,
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
  db: DbExecutor,
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
  db: DbExecutor,
  playerId: string,
): Promise<InventorySnapshot> {
  const rows = await db
    .select()
    .from(inventory)
    .where(eq(inventory.playerId, playerId));

  return rowsToInventorySnapshot(rows);
}

export async function getInventoryQuantity(
  db: DbExecutor,
  playerId: string,
  resourceId: ResourceId,
): Promise<number> {
  const [row] = await db
    .select({ quantity: inventory.quantity })
    .from(inventory)
    .where(
      and(
        eq(inventory.playerId, playerId),
        eq(inventory.resourceId, resourceId),
      ),
    )
    .limit(1);

  return row?.quantity ?? 0;
}
