import type { WalletCrowns } from "./crown.js";
import type { ResourceId } from "./resources.js";

export type InventorySnapshot = Partial<Record<ResourceId, number>>;

export type TickBroadcast = {
  kind: "tick";
  tickId: number;
  walletCrowns: WalletCrowns;
  inventory: InventorySnapshot;
};

export type PlaceOrderCommand = {
  kind: "place_order";
  resourceId: ResourceId;
  side: "buy" | "sell";
  price: number;
  quantity: number;
};

export type CancelOrderCommand = {
  kind: "cancel_order";
  orderId: string;
};

export type PoolBuyCommand = {
  kind: "pool_buy";
  resourceId: ResourceId;
  quantity: number;
};

export type SetAssignmentCommand = {
  kind: "set_assignment";
  buildingId: string;
  assignmentId: string;
};

export type ClientCommand =
  | PlaceOrderCommand
  | CancelOrderCommand
  | PoolBuyCommand
  | SetAssignmentCommand;
