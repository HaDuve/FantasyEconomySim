import type { WalletCrowns } from "./crown.js";
import type { AssignmentId } from "./assignments.js";
import type { PublicBuildingTypeId } from "./buildings.js";
import type { ResourceId } from "./resources.js";

export type InventorySnapshot = Partial<Record<ResourceId, number>>;

export type BookLevelSnapshot = {
  orderId: string;
  price: number;
  quantity: number;
};

export type ResourceBookSnapshot = {
  resourceId: ResourceId;
  bids: BookLevelSnapshot[];
  asks: BookLevelSnapshot[];
};

export type PlayerOrderSnapshot = {
  id: string;
  resourceId: ResourceId;
  side: "buy" | "sell";
  price: number;
  quantity: number;
};

export type AssignmentSnapshot = {
  workerId: string;
  assignmentId: AssignmentId;
  buildingId?: string;
  publicBuildingTypeId?: PublicBuildingTypeId;
};

export type TickBroadcast = {
  kind: "tick";
  tickId: number;
  books: ResourceBookSnapshot[];
  walletCrowns: WalletCrowns;
  inventory: InventorySnapshot;
  orders: PlayerOrderSnapshot[];
  assignments: AssignmentSnapshot[];
};

export type CommandKind = ClientCommand["kind"] | "unknown";

export type CommandErrorMessage = {
  kind: "command_error";
  commandKind: CommandKind;
  code: string;
};

export type CommandOkMessage = {
  kind: "command_ok";
  commandKind: ClientCommand["kind"];
};

export type ServerMessage =
  | TickBroadcast
  | CommandErrorMessage
  | CommandOkMessage;

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
