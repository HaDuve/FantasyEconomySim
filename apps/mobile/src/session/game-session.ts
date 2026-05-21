import type {
  CancelOrderCommand,
  ClientCommand,
  PlaceOrderCommand,
  PoolBuyCommand,
  PrivateBuildingTypeId,
  PurchasePrivateBuildingCommand,
  SetAssignmentCommand,
  StarterTrioProfessionId,
  TickBroadcast,
} from "@fantasy-economy-sim/domain";

import {
  ConnectGuestError,
  postConnectGuest,
  type ConnectGuestResponse,
} from "../api/connect-guest";
import { formatCommandError } from "../sync/format-command-error";
import { sendClientCommand } from "../sync/send-client-command";
import type { CreateWebSocket, SyncSocket } from "../sync/sync-client";
import { openSyncClient } from "../sync/sync-client";
import { parseServerMessage } from "../sync/parse-server-message";
import type { PoolBuyInput } from "../production/pool-buy";
import type { SetAssignmentInput } from "../production/starter-flow";
import {
  applyConnectGuest,
  applyPoolBuyOk,
  applyTickBroadcast,
  initialHudState,
  type HudState,
} from "./hud-state";

export type GuestAuth = {
  signInAnonymously(): Promise<{ idToken: string }>;
};

export type GameSessionPhase = "booting" | "onboarding" | "hud" | "error";

export type GameSessionState = {
  phase: GameSessionPhase;
  hud: HudState;
  idToken: string | null;
  professionSent: boolean;
  pendingPoolBuy?: PoolBuyInput;
};

export type GameSessionDeps = {
  apiBaseUrl: string;
  auth: GuestAuth;
  fetch?: typeof fetch;
  createWebSocket: CreateWebSocket;
  onChange: (state: GameSessionState) => void;
};

export function initialGameSessionState(): GameSessionState {
  return {
    phase: "booting",
    hud: initialHudState(),
    idToken: null,
    professionSent: false,
  };
}

function connectErrorMessage(error: unknown): string {
  return error instanceof ConnectGuestError ? error.code : "connect_failed";
}

export type PlaceOrderInput = Omit<PlaceOrderCommand, "kind">;
export function createGameSession(deps: GameSessionDeps): {
  start(): Promise<void>;
  pickProfession(profession: StarterTrioProfessionId): Promise<void>;
  placeOrder(input: PlaceOrderInput): void;
  cancelOrder(orderId: string): void;
  poolBuy(input: PoolBuyInput): void;
  purchasePrivateBuilding(buildingTypeId: PrivateBuildingTypeId): void;
  setAssignment(input: SetAssignmentInput): void;
  stop(): void;
  getState(): GameSessionState;
} {
  let state = initialGameSessionState();
  let closeSync: (() => void) | undefined;
  let syncSocket: SyncSocket | undefined;

  function emit(next: GameSessionState): void {
    state = next;
    deps.onChange(state);
  }

  function patchHud(patch: Partial<HudState>): void {
    emit({ ...state, hud: { ...state.hud, ...patch } });
  }

  function applyConnect(connect: ConnectGuestResponse): void {
    const hud = applyConnectGuest(state.hud, connect);
    emit({
      ...state,
      hud,
      phase: connect.starterPackageGranted ? "hud" : "onboarding",
    });
  }

  function handleTickRaw(raw: string): void {
    const message = parseServerMessage(raw);
    if (message?.kind !== "tick") {
      return;
    }

    emit({
      ...state,
      hud: applyTickBroadcast(state.hud, message as TickBroadcast),
    });
  }

  function connectSync(idToken: string): void {
    closeSync?.();
    patchHud({ connectionStatus: "connecting", errorMessage: null });

    const connection = openSyncClient(
      deps.apiBaseUrl,
      idToken,
      {
        onOpen: () => patchHud({ connectionStatus: "connected" }),
        onTick: handleTickRaw,
        onCommandOk: (ok) => {
          if (ok.commandKind === "pool_buy" && state.pendingPoolBuy) {
            patchHud(applyPoolBuyOk(state.hud, state.pendingPoolBuy));
            emit({ ...state, pendingPoolBuy: undefined });
            return;
          }

          if (ok.commandKind === "purchase_private_building") {
            void refreshFromConnect().catch((error: unknown) => {
              patchHud({
                errorMessage:
                  error instanceof ConnectGuestError
                    ? error.code
                    : "connect_failed",
              });
            });
          }
        },
        onCommandError: (error) =>
          patchHud({ errorMessage: formatCommandError(error) }),
        onClose: () => patchHud({ connectionStatus: "disconnected" }),
        onError: () =>
          patchHud({
            connectionStatus: "error",
            errorMessage: "sync_connection_failed",
          }),
      },
      deps.createWebSocket,
    );
    syncSocket = connection.socket;
    closeSync = connection.close;
  }

  async function refreshFromConnect(): Promise<void> {
    if (!state.idToken) {
      return;
    }

    const connect = await postConnectGuest(
      deps.apiBaseUrl,
      state.idToken,
      {},
      deps.fetch,
    );
    patchHud(applyConnectGuest(state.hud, connect));
  }

  function sendCommand(command: ClientCommand): void {
    if (!syncSocket) {
      patchHud({ errorMessage: "sync_not_connected" });
      return;
    }

    try {
      sendClientCommand(syncSocket, command);
    } catch {
      patchHud({ errorMessage: "sync_not_connected" });
    }
  }

  async function connectWithProfession(
    profession?: StarterTrioProfessionId,
  ): Promise<void> {
    if (!state.idToken) {
      throw new Error("not_authenticated");
    }

    if (profession && state.professionSent) {
      return;
    }

    const connect = await postConnectGuest(
      deps.apiBaseUrl,
      state.idToken,
      profession ? { profession } : {},
      deps.fetch,
    );

    if (profession) {
      emit({ ...state, professionSent: true });
    }

    applyConnect(connect);

    if (connect.starterPackageGranted) {
      connectSync(state.idToken);
    }
  }

  return {
    getState: () => state,

    async start() {
      const { idToken } = await deps.auth.signInAnonymously();
      emit({ ...state, idToken, phase: "booting" });

      try {
        await connectWithProfession();
      } catch (error) {
        if (
          error instanceof ConnectGuestError &&
          error.code === "profession_required"
        ) {
          emit({ ...state, phase: "onboarding" });
          return;
        }

        emit({
          ...state,
          phase: "error",
          hud: {
            ...state.hud,
            connectionStatus: "error",
            errorMessage: connectErrorMessage(error),
          },
        });
      }
    },

    async pickProfession(profession: StarterTrioProfessionId) {
      try {
        await connectWithProfession(profession);
      } catch (error) {
        patchHud({ errorMessage: connectErrorMessage(error) });
      }
    },

    placeOrder(input) {
      sendCommand({ kind: "place_order", ...input });
    },

    cancelOrder(orderId) {
      sendCommand({ kind: "cancel_order", orderId });
    },

    poolBuy(input) {
      emit({ ...state, pendingPoolBuy: input });
      sendCommand({ kind: "pool_buy", ...input } satisfies PoolBuyCommand);
    },

    purchasePrivateBuilding(buildingTypeId) {
      sendCommand({
        kind: "purchase_private_building",
        buildingTypeId,
      } satisfies PurchasePrivateBuildingCommand);
    },

    setAssignment(input) {
      sendCommand({ kind: "set_assignment", ...input } satisfies SetAssignmentCommand);
    },

    stop() {
      closeSync?.();
      closeSync = undefined;
      syncSocket = undefined;
    },
  };
}
