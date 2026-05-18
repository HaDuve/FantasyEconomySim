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

export type TickAuctionResult = {
  fillsApplied: number;
};

function toLimitOrder(order: OpenOrder): LimitOrder {
  return {
    orderId: order.id,
    price: order.price,
    quantity: order.quantity,
    placedAt: order.placedAt.getTime(),
  };
}

export async function listOpenOrders(db: DbExecutor): Promise<OpenOrder[]> {
  const rows = await db.select().from(orders).where(gt(orders.quantity, 0));

  return rows.map(rowToOpenOrder);
}

async function applyFill(
  db: DbExecutor,
  resourceId: ResourceId,
  fill: Fill,
  buyOrder: OpenOrder,
  sellOrder: OpenOrder,
): Promise<void> {
  const cost = fill.price * fill.quantity;

  const buyerWallet = await getWallet(db, buyOrder.playerId);
  const buyerCrowns = buyerWallet?.crowns ?? 0;

  if (buyerCrowns < cost) {
    throw new Error("Settlement would drive buyer crowns negative");
  }

  const sellerHeld = await getInventoryQuantity(
    db,
    sellOrder.playerId,
    resourceId,
  );

  if (sellerHeld < fill.quantity) {
    throw new Error("Settlement would drive seller inventory negative");
  }

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

export async function runTickAuction(db: Db): Promise<TickAuctionResult> {
  return db.transaction(async (tx) => {
    const openOrders = await listOpenOrders(tx);
    const ordersById = new Map(openOrders.map((order) => [order.id, order]));
    let fillsApplied = 0;

    for (const resourceId of RESOURCE_IDS) {
      const resourceOrders = openOrders.filter(
        (order) => order.resourceId === resourceId,
      );

      if (resourceOrders.length === 0) {
        continue;
      }

      const bids = resourceOrders
        .filter((order) => order.side === "buy")
        .map(toLimitOrder);
      const asks = resourceOrders
        .filter((order) => order.side === "sell")
        .map(toLimitOrder);

      const { fills, remainingBids, remainingAsks } = match(
        resourceId,
        bids,
        asks,
      );

      const remainingById = new Map(
        [...remainingBids, ...remainingAsks].map((order) => [
          order.orderId,
          order.quantity,
        ]),
      );

      for (const fill of fills) {
        const buyOrder = ordersById.get(fill.buyOrderId);
        const sellOrder = ordersById.get(fill.sellOrderId);

        if (!buyOrder || !sellOrder) {
          throw new Error("Matched order missing from open book");
        }

        await applyFill(tx, resourceId, fill, buyOrder, sellOrder);
        fillsApplied += 1;
      }

      for (const order of resourceOrders) {
        const remainingQty = remainingById.get(order.id);

        if (remainingQty !== undefined) {
          await syncOrderQuantity(tx, order.id, remainingQty);
        } else if (
          fills.some(
            (fill) =>
              fill.buyOrderId === order.id || fill.sellOrderId === order.id,
          )
        ) {
          await syncOrderQuantity(tx, order.id, 0);
        }
      }
    }

    return { fillsApplied };
  });
}
