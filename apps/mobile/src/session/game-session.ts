import type { StarterTrioProfessionId, TickBroadcast } from "@fantasy-economy-sim/domain";

import {
  ConnectGuestError,
  postConnectGuest,
  type ConnectGuestResponse,
} from "../api/connect-guest";
import type { CreateWebSocket } from "../sync/sync-client";
import { openSyncClient } from "../sync/sync-client";
import { parseServerMessage } from "../sync/parse-server-message";
import {
  applyConnectGuest,
  applyTickBroadcast,
  initialHudState,
  type HudState,
} from "./hud-state";

export type GuestAuth = {
  signInAnonymously(): Promise<{ idToken: string }>;
};

export type GameSessionPhase = "booting" | "onboarding" | "hud";

export type GameSessionState = {
  phase: GameSessionPhase;
  hud: HudState;
  idToken: string | null;
  professionSent: boolean;
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

export function createGameSession(deps: GameSessionDeps): {
  start(): Promise<void>;
  pickProfession(profession: StarterTrioProfessionId): Promise<void>;
  getState(): GameSessionState;
} {
  let state = initialGameSessionState();
  let closeSync: (() => void) | undefined;

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

    closeSync = openSyncClient(
      deps.apiBaseUrl,
      idToken,
      {
        onOpen: () => patchHud({ connectionStatus: "connected" }),
        onTick: handleTickRaw,
        onClose: () => patchHud({ connectionStatus: "disconnected" }),
        onError: () =>
          patchHud({
            connectionStatus: "error",
            errorMessage: "sync_connection_failed",
          }),
      },
      deps.createWebSocket,
    );
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

        patchHud({
          connectionStatus: "error",
          errorMessage:
            error instanceof ConnectGuestError ? error.code : "connect_failed",
        });
        emit({ ...state, phase: "onboarding" });
      }
    },

    async pickProfession(profession: StarterTrioProfessionId) {
      await connectWithProfession(profession);
    },
  };
}
