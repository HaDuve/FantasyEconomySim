import type {
  InventorySnapshot,
  PlayerOrderSnapshot,
  ResourceBookSnapshot,
  StarterTrioProfessionId,
  TickBroadcast,
  WalletCrowns,
} from "@fantasy-economy-sim/domain";

import type { ConnectGuestResponse } from "../api/connect-guest";

export type ConnectionStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "disconnected"
  | "error";

export type HudState = {
  tickId: number | null;
  walletCrowns: WalletCrowns | null;
  inventory: InventorySnapshot;
  books: ResourceBookSnapshot[];
  orders: PlayerOrderSnapshot[];
  workers: StarterTrioProfessionId[];
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
    workers: connect.workers.map((worker) => worker.profession),
    errorMessage: null,
  };
}
