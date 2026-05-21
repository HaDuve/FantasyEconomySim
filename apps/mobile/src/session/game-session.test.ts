import type { StarterTrioProfessionId } from "@fantasy-economy-sim/domain";

import { SYNC_OPEN, type SyncSocket } from "../sync/sync-client";
import { createGameSession } from "./game-session";

function mockSocket(): SyncSocket & { trigger: (type: "open" | "message", data?: string) => void } {
  const handlers: {
    onopen: ((event: unknown) => void) | null;
    onmessage: ((event: { data: string }) => void) | null;
    onclose: ((event: unknown) => void) | null;
    onerror: ((event: unknown) => void) | null;
  } = {
    onopen: null,
    onmessage: null,
    onclose: null,
    onerror: null,
  };

  return {
    readyState: SYNC_OPEN,
    get onopen() {
      return handlers.onopen;
    },
    set onopen(value) {
      handlers.onopen = value;
    },
    get onmessage() {
      return handlers.onmessage;
    },
    set onmessage(value) {
      handlers.onmessage = value;
    },
    get onclose() {
      return handlers.onclose;
    },
    set onclose(value) {
      handlers.onclose = value;
    },
    get onerror() {
      return handlers.onerror;
    },
    set onerror(value) {
      handlers.onerror = value;
    },
    close: jest.fn(),
    trigger(type, data) {
      if (type === "open") {
        handlers.onopen?.({});
      }
      if (type === "message" && data !== undefined) {
        handlers.onmessage?.({ data });
      }
    },
  };
}

describe("createGameSession", () => {
  it("sends profession once, then shows worker and balances after starter package", async () => {
    const fetchImpl = jest
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: "profession_required" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          playerId: "p1",
          crowns: 100,
          inventory: {},
          workers: [{ profession: "hunter" }],
          starterPackageGranted: true,
        }),
      });

    const socket = mockSocket();
    const states: ReturnType<typeof createGameSession>["getState"][] = [];
    const session = createGameSession({
      apiBaseUrl: "http://localhost:3000",
      auth: { signInAnonymously: async () => ({ idToken: "guest-token" }) },
      fetch: fetchImpl,
      createWebSocket: () => socket,
      onChange: (state) => states.push(() => state),
    });

    await session.start();
    expect(session.getState().phase).toBe("onboarding");

    await session.pickProfession("hunter" as StarterTrioProfessionId);

    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(JSON.parse(fetchImpl.mock.calls[1][1].body)).toEqual({
      profession: "hunter",
    });
    expect(session.getState().hud.workers).toEqual(["hunter"]);
    expect(session.getState().hud.walletCrowns).toBe(100);
    expect(session.getState().phase).toBe("hud");
    expect(session.getState().professionSent).toBe(true);

    socket.trigger("open");
    socket.trigger(
      "message",
      JSON.stringify({
        kind: "tick",
        tickId: 7,
        walletCrowns: 99,
        inventory: { grain: 1 },
        books: [],
        orders: [],
        assignments: [],
      }),
    );

    expect(session.getState().hud.tickId).toBe(7);
    expect(session.getState().hud.walletCrowns).toBe(99);
    expect(session.getState().hud.connectionStatus).toBe("connected");
  });
});
