import { isResourceId, type ResourceId } from "./resources.js";

export type LimitOrder = {
  orderId: string;
  price: number;
  quantity: number;
  placedAt: number;
};

export type Fill = {
  buyOrderId: string;
  sellOrderId: string;
  price: number;
  quantity: number;
};

export type MatchResult = {
  fills: Fill[];
  remainingBids: LimitOrder[];
  remainingAsks: LimitOrder[];
};

export function match(
  resource: ResourceId,
  bids: LimitOrder[],
  asks: LimitOrder[],
): MatchResult {
  assertTradeableResource(resource);
  for (const bid of bids) {
    assertPositiveQuantity(bid);
  }
  for (const ask of asks) {
    assertPositiveQuantity(ask);
  }

  const remainingBids = sortBids(bids.map(cloneOrder));
  const remainingAsks = sortAsks(asks.map(cloneOrder));
  const fills: Fill[] = [];

  let bidIndex = 0;
  let askIndex = 0;

  while (bidIndex < remainingBids.length && askIndex < remainingAsks.length) {
    const bid = remainingBids[bidIndex]!;
    const ask = remainingAsks[askIndex]!;

    if (bid.price < ask.price) {
      break;
    }

    const quantity = Math.min(bid.quantity, ask.quantity);
    const price = Math.min(bid.price, ask.price);

    fills.push({
      buyOrderId: bid.orderId,
      sellOrderId: ask.orderId,
      price,
      quantity,
    });

    bid.quantity -= quantity;
    ask.quantity -= quantity;

    if (bid.quantity === 0) {
      bidIndex += 1;
    }
    if (ask.quantity === 0) {
      askIndex += 1;
    }
  }

  return {
    fills,
    remainingBids: remainingBids.slice(bidIndex).filter((order) => order.quantity > 0),
    remainingAsks: remainingAsks.slice(askIndex).filter((order) => order.quantity > 0),
  };
}

function cloneOrder(order: LimitOrder): LimitOrder {
  return { ...order };
}

function sortBids(bids: LimitOrder[]): LimitOrder[] {
  return [...bids].sort(compareBids);
}

function sortAsks(asks: LimitOrder[]): LimitOrder[] {
  return [...asks].sort(compareAsks);
}

function compareBids(a: LimitOrder, b: LimitOrder): number {
  if (b.price !== a.price) {
    return b.price - a.price;
  }
  return a.placedAt - b.placedAt;
}

function compareAsks(a: LimitOrder, b: LimitOrder): number {
  if (a.price !== b.price) {
    return a.price - b.price;
  }
  return a.placedAt - b.placedAt;
}

function assertTradeableResource(resource: string): asserts resource is ResourceId {
  if (!isResourceId(resource)) {
    throw new Error(`Resource is not tradeable on the market: ${resource}`);
  }
}

function assertPositiveQuantity(order: LimitOrder): void {
  if (!Number.isInteger(order.quantity) || order.quantity <= 0) {
    throw new Error(`Invalid order quantity: ${order.quantity}`);
  }
}
