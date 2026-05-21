import {
  getPrivateBuildingCost,
  type AssignmentSnapshot,
  type InventorySnapshot,
  type PlayerOrderSnapshot,
  type PrivateBuildingTypeId,
  type ResourceBookSnapshot,
  type StarterTrioProfessionId,
  type TickBroadcast,
  type WalletCrowns,
} from "@fantasy-economy-sim/domain";

import type { ConnectGuestResponse } from "../api/connect-guest";
import { isValidPoolBuyInput, poolBuyCost, type PoolBuyInput } from "../production/pool-buy";

export type ConnectionStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "disconnected"
  | "error";

export type HudWorker = {
  id: string;
  profession: StarterTrioProfessionId;
};

export type HudPrivateBuilding = {
  id: string;
  buildingTypeId: PrivateBuildingTypeId;
};

export type HudState = {
  tickId: number | null;
  walletCrowns: WalletCrowns | null;
  inventory: InventorySnapshot;
  books: ResourceBookSnapshot[];
  orders: PlayerOrderSnapshot[];
  workers: HudWorker[];
  privateBuildings: HudPrivateBuilding[];
  assignments: AssignmentSnapshot[];
  connectionStatus: ConnectionStatus;
  errorMessage: string | null;
};

export function initialHudState(): HudState {
  return {
    tickId: null,
    walletCrowns: null,
    inventory: {},
    books: [],
    orders: [],
    workers: [],
    privateBuildings: [],
    assignments: [],
    connectionStatus: "idle",
    errorMessage: null,
  };
}

export function applyTickBroadcast(state: HudState, tick: TickBroadcast): HudState {
  return {
    ...state,
    tickId: tick.tickId,
    walletCrowns: tick.walletCrowns,
    inventory: tick.inventory,
    books: tick.books,
    orders: tick.orders,
    assignments: tick.assignments,
    errorMessage: null,
  };
}

export function applyPrivateBuildingPurchasePending(
  state: HudState,
  buildingTypeId: PrivateBuildingTypeId,
): HudState {
  if (state.walletCrowns === null) {
    return state;
  }

  return {
    ...state,
    walletCrowns: state.walletCrowns - getPrivateBuildingCost(buildingTypeId),
    errorMessage: null,
  };
}

export function applyPoolBuyOk(state: HudState, input: PoolBuyInput): HudState {
  if (state.walletCrowns === null || !isValidPoolBuyInput(input)) {
    return state;
  }

  const cost = poolBuyCost(input.resourceId, input.quantity);
  const held = state.inventory[input.resourceId] ?? 0;

  return {
    ...state,
    walletCrowns: state.walletCrowns - cost,
    inventory: {
      ...state.inventory,
      [input.resourceId]: held + input.quantity,
    },
    errorMessage: null,
  };
}

export function applyConnectGuest(
  state: HudState,
  connect: ConnectGuestResponse,
): HudState {
  return {
    ...state,
    walletCrowns: connect.crowns,
    inventory: connect.inventory,
    workers: connect.workers,
    privateBuildings: connect.privateBuildings ?? [],
    errorMessage: null,
  };
}
