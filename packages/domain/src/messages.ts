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
  workerId: string;
  assignmentId: string;
  /** Required for **bound worker** **assignments**; omit for **field work**. */
  buildingId?: string;
};

export type PurchasePrivateBuildingCommand = {
  kind: "purchase_private_building";
  buildingTypeId: string;
};

export type ClientCommand =
  | PlaceOrderCommand
  | CancelOrderCommand
  | PoolBuyCommand
  | SetAssignmentCommand
  | PurchasePrivateBuildingCommand;
