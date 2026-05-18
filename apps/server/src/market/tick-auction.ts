import {
  match,
  RESOURCE_IDS,
  type Fill,
  type LimitOrder,
  type ResourceId,
} from "@fantasy-economy-sim/domain";
import { eq, gt } from "drizzle-orm";

import type { Db, DbExecutor } from "../db/client.js";
import {
  getInventoryQuantity,
  getWallet,
  setInventoryQuantity,
  setWalletCrowns,
} from "../db/ledger.js";
import { orders, settlements } from "../db/schema.js";
import type { OpenOrder } from "./orders.js";
import { rowToOpenOrder } from "./orders.js";

function orderPairKey(buyOrderId: string, sellOrderId: string): string {
  return `${buyOrderId}:${sellOrderId}`;
}

export type TickAuctionResult = {
  fillsApplied: number;
  fillsSkipped: number;
};

function toLimitOrder(order: OpenOrder): LimitOrder {
  return {
    orderId: order.id,
    price: order.price,
    quantity: order.quantity,
    placedAt: order.placedAt.getTime(),
  };
}

/** Open orders only; quantity 0 means fully filled (closed), kept for settlement FKs. */
export async function listOpenOrders(db: DbExecutor): Promise<OpenOrder[]> {
  const rows = await db.select().from(orders).where(gt(orders.quantity, 0));

  return rows.map(rowToOpenOrder);
}

function canSettleFill(
  db: DbExecutor,
  resourceId: ResourceId,
  fill: Fill,
  buyOrder: OpenOrder,
  sellOrder: OpenOrder,
): Promise<boolean> {
  const cost = fill.price * fill.quantity;

  return Promise.all([
    getWallet(db, buyOrder.playerId),
    getInventoryQuantity(db, sellOrder.playerId, resourceId),
  ]).then(([buyerWallet, sellerHeld]) => {
    const buyerCrowns = buyerWallet?.crowns ?? 0;
    return buyerCrowns >= cost && sellerHeld >= fill.quantity;
  });
}

async function applyFill(
  db: DbExecutor,
  tickId: number,
  resourceId: ResourceId,
  fill: Fill,
  buyOrder: OpenOrder,
  sellOrder: OpenOrder,
): Promise<void> {
  const cost = fill.price * fill.quantity;

  const buyerWallet = await getWallet(db, buyOrder.playerId);
  const buyerCrowns = buyerWallet?.crowns ?? 0;
  const sellerHeld = await getInventoryQuantity(
    db,
    sellOrder.playerId,
    resourceId,
  );
  const buyerHeld = await getInventoryQuantity(db, buyOrder.playerId, resourceId);
  const sellerWallet = await getWallet(db, sellOrder.playerId);
  const sellerCrowns = sellerWallet?.crowns ?? 0;

  await setWalletCrowns(db, buyOrder.playerId, buyerCrowns - cost);
  await setWalletCrowns(db, sellOrder.playerId, sellerCrowns + cost);
  await setInventoryQuantity(
    db,
    buyOrder.playerId,
    resourceId,
    buyerHeld + fill.quantity,
  );
  await setInventoryQuantity(
    db,
    sellOrder.playerId,
    resourceId,
    sellerHeld - fill.quantity,
  );

  await db.insert(settlements).values({
    tickId,
    resourceId,
    price: fill.price,
    quantity: fill.quantity,
    buyOrderId: fill.buyOrderId,
    sellOrderId: fill.sellOrderId,
    buyerPlayerId: buyOrder.playerId,
    sellerPlayerId: sellOrder.playerId,
  });
}

async function syncOrderQuantity(
  db: DbExecutor,
  orderId: string,
  quantity: number,
): Promise<void> {
  await db.update(orders).set({ quantity }).where(eq(orders.id, orderId));
}

async function runResourceTickAuction(
  tx: DbExecutor,
  tickId: number,
  resourceId: ResourceId,
): Promise<{ fillsApplied: number; fillsSkipped: number }> {
  let fillsApplied = 0;
  let fillsSkipped = 0;
  const blockedPairs = new Set<string>();

  while (true) {
    const resourceOrders = (await listOpenOrders(tx)).filter(
      (order) => order.resourceId === resourceId,
    );

    if (resourceOrders.length === 0) {
      break;
    }

    const bids = resourceOrders
      .filter((order) => order.side === "buy")
      .map(toLimitOrder);
    const asks = resourceOrders
      .filter((order) => order.side === "sell")
      .map(toLimitOrder);
    const { fills } = match(resourceId, bids, asks, { blockedPairs });

    if (fills.length === 0) {
      break;
    }

    const fill = fills[0]!;
    const buyOrder = resourceOrders.find((order) => order.id === fill.buyOrderId);
    const sellOrder = resourceOrders.find((order) => order.id === fill.sellOrderId);

    if (!buyOrder || !sellOrder) {
      throw new Error("Matched order missing from open book");
    }

    if (!(await canSettleFill(tx, resourceId, fill, buyOrder, sellOrder))) {
      fillsSkipped += 1;
      blockedPairs.add(orderPairKey(fill.buyOrderId, fill.sellOrderId));
      continue;
    }

    await applyFill(tx, tickId, resourceId, fill, buyOrder, sellOrder);
    fillsApplied += 1;

    const buyRemaining = buyOrder.quantity - fill.quantity;
    const sellRemaining = sellOrder.quantity - fill.quantity;

    await syncOrderQuantity(tx, buyOrder.id, buyRemaining);
    await syncOrderQuantity(tx, sellOrder.id, sellRemaining);
  }

  return { fillsApplied, fillsSkipped };
}

export async function runTickAuction(
  db: Db,
  tickId: number,
): Promise<TickAuctionResult> {
  return db.transaction(async (tx) => {
    let fillsApplied = 0;
    let fillsSkipped = 0;

    for (const resourceId of RESOURCE_IDS) {
      const result = await runResourceTickAuction(tx, tickId, resourceId);
      fillsApplied += result.fillsApplied;
      fillsSkipped += result.fillsSkipped;
    }

    return { fillsApplied, fillsSkipped };
  });
}
