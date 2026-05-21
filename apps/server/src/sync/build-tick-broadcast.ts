import {
  RESOURCE_IDS,
  toWalletCrowns,
  type AssignmentId,
  type PublicBuildingTypeId,
  type ResourceBookSnapshot,
  type ResourceId,
  type TickBroadcast,
} from "@fantasy-economy-sim/domain";

import type { Db, DbExecutor } from "../db/client.js";
import { getInventory, getWallet } from "../db/ledger.js";
import type { OpenOrder } from "../market/orders.js";
import { listOpenOrders } from "../market/tick-auction.js";
import { getWorkerAssignments } from "../production/assignments.js";

function compareBids(a: OpenOrder, b: OpenOrder): number {
  if (b.price !== a.price) {
    return b.price - a.price;
  }
  return a.placedAt.getTime() - b.placedAt.getTime();
}

function compareAsks(a: OpenOrder, b: OpenOrder): number {
  if (a.price !== b.price) {
    return a.price - b.price;
  }
  return a.placedAt.getTime() - b.placedAt.getTime();
}

export function buildResourceBookSnapshotsFromOrders(
  openOrders: OpenOrder[],
): ResourceBookSnapshot[] {
  const byResource = new Map<ResourceId, OpenOrder[]>();

  for (const resourceId of RESOURCE_IDS) {
    byResource.set(resourceId, []);
  }

  for (const order of openOrders) {
    byResource.get(order.resourceId)?.push(order);
  }

  return RESOURCE_IDS.map((resourceId) => {
    const orders = byResource.get(resourceId) ?? [];
    const bids = orders.filter((order) => order.side === "buy").sort(compareBids);
    const asks = orders.filter((order) => order.side === "sell").sort(compareAsks);

    return {
      resourceId,
      bids: bids.map((order) => ({
        orderId: order.id,
        price: order.price,
        quantity: order.quantity,
      })),
      asks: asks.map((order) => ({
        orderId: order.id,
        price: order.price,
        quantity: order.quantity,
      })),
    };
  });
}

export async function buildResourceBookSnapshots(
  db: DbExecutor,
): Promise<ResourceBookSnapshot[]> {
  return buildResourceBookSnapshotsFromOrders(await listOpenOrders(db));
}

export async function buildTickBroadcast(
  db: Db,
  playerId: string,
  tickId: number,
  options: {
    books: ResourceBookSnapshot[];
    openOrders: OpenOrder[];
  },
): Promise<TickBroadcast> {
  const wallet = await getWallet(db, playerId);
  const playerOrders = options.openOrders.filter(
    (order) => order.playerId === playerId,
  );
  const assignments = await getWorkerAssignments(db, playerId);

  return {
    kind: "tick",
    tickId,
    books: options.books,
    walletCrowns: toWalletCrowns(wallet?.crowns ?? 0),
    inventory: await getInventory(db, playerId),
    orders: playerOrders.map((order) => ({
      id: order.id,
      resourceId: order.resourceId,
      side: order.side,
      price: order.price,
      quantity: order.quantity,
    })),
    assignments: assignments.map((row) => ({
      workerId: row.workerId,
      assignmentId: row.assignmentId as AssignmentId,
      ...(row.privateBuildingId
        ? { buildingId: row.privateBuildingId }
        : {}),
      ...(row.publicBuildingTypeId
        ? {
            publicBuildingTypeId:
              row.publicBuildingTypeId as PublicBuildingTypeId,
          }
        : {}),
    })),
  };
}
