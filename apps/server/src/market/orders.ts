import type { ResourceId } from "@fantasy-economy-sim/domain";
import { isResourceId } from "@fantasy-economy-sim/domain";
import { and, eq, gt } from "drizzle-orm";

import type { Db, DbExecutor } from "../db/client.js";
import { getInventoryQuantity } from "../db/ledger.js";
import { getWallet } from "../db/ledger.js";
import { orders } from "../db/schema.js";

export type OrderSide = "buy" | "sell";

export type OpenOrder = {
  id: string;
  playerId: string;
  resourceId: ResourceId;
  side: OrderSide;
  price: number;
  quantity: number;
  placedAt: Date;
};

export type PlaceOrderInput = {
  resourceId: ResourceId;
  side: OrderSide;
  price: number;
  quantity: number;
};

function assertPlaceOrderInput(input: PlaceOrderInput): void {
  if (!isResourceId(input.resourceId)) {
    throw new Error(`Unknown resource: ${input.resourceId}`);
  }

  if (input.side !== "buy" && input.side !== "sell") {
    throw new Error(`Invalid order side: ${input.side}`);
  }

  if (!Number.isInteger(input.price) || input.price <= 0) {
    throw new Error(`Invalid order price: ${input.price}`);
  }

  if (!Number.isInteger(input.quantity) || input.quantity <= 0) {
    throw new Error(`Invalid order quantity: ${input.quantity}`);
  }
}

export function rowToOpenOrder(row: typeof orders.$inferSelect): OpenOrder {
  return {
    id: row.id,
    playerId: row.playerId,
    resourceId: row.resourceId as ResourceId,
    side: row.side as OrderSide,
    price: row.price,
    quantity: row.quantity,
    placedAt: row.placedAt,
  };
}

export async function placeOrder(
  db: DbExecutor,
  playerId: string,
  input: PlaceOrderInput,
): Promise<OpenOrder> {
  assertPlaceOrderInput(input);

  if (input.side === "buy") {
    const wallet = await getWallet(db, playerId);
    const crowns = wallet?.crowns ?? 0;
    const required = input.price * input.quantity;

    if (crowns < required) {
      throw new Error("Insufficient crowns for buy order");
    }
  } else {
    const held = await getInventoryQuantity(db, playerId, input.resourceId);

    if (held < input.quantity) {
      throw new Error("Insufficient inventory for sell order");
    }
  }

  const [row] = await db
    .insert(orders)
    .values({
      playerId,
      resourceId: input.resourceId,
      side: input.side,
      price: input.price,
      quantity: input.quantity,
    })
    .returning();

  if (!row) {
    throw new Error("Failed to place order");
  }

  return rowToOpenOrder(row);
}

export async function getOpenOrder(
  db: DbExecutor,
  orderId: string,
): Promise<OpenOrder | undefined> {
  const [row] = await db
    .select()
    .from(orders)
    .where(and(eq(orders.id, orderId), gt(orders.quantity, 0)))
    .limit(1);

  return row ? rowToOpenOrder(row) : undefined;
}

export async function cancelOrder(
  db: DbExecutor,
  playerId: string,
  orderId: string,
): Promise<void> {
  const deleted = await db
    .delete(orders)
    .where(and(eq(orders.id, orderId), eq(orders.playerId, playerId)))
    .returning({ id: orders.id });

  if (deleted.length === 0) {
    throw new Error("Order not found");
  }
}
