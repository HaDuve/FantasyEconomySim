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
    send: jest.fn(),
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
          workers: [{ id: "w1", profession: "hunter" }],
          privateBuildings: [],
          starterPackageGranted: true,
        }),
      });

    const socket = mockSocket();
    const session = createGameSession({
      apiBaseUrl: "http://localhost:3000",
      auth: { signInAnonymously: async () => ({ idToken: "guest-token" }) },
      fetch: fetchImpl,
      createWebSocket: () => socket,
      onChange: () => {},
    });

    await session.start();
    expect(session.getState().phase).toBe("onboarding");

    await session.pickProfession("hunter" as StarterTrioProfessionId);

    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(JSON.parse(fetchImpl.mock.calls[1][1].body)).toEqual({
      profession: "hunter",
    });
    expect(session.getState().hud.workers).toEqual([{ id: "w1", profession: "hunter" }]);
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

  it("skips onboarding for a returning guest with starter package already granted", async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        playerId: "p1",
        crowns: 100,
        inventory: { grain: 2 },
        workers: [{ id: "w1", profession: "miner" }],
        privateBuildings: [],
        starterPackageGranted: true,
      }),
    });

    const socket = mockSocket();
    const session = createGameSession({
      apiBaseUrl: "http://localhost:3000",
      auth: { signInAnonymously: async () => ({ idToken: "guest-token" }) },
      fetch: fetchImpl,
      createWebSocket: () => socket,
      onChange: () => {},
    });

    await session.start();

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(fetchImpl.mock.calls[0][1].body).toBe("{}");
    expect(session.getState().phase).toBe("hud");
    expect(session.getState().hud.workers).toEqual([{ id: "w1", profession: "miner" }]);
    expect(session.getState().professionSent).toBe(false);
  });

  it("enters error phase when connect fails for reasons other than profession_required", async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: "internal_error" }),
    });

    const session = createGameSession({
      apiBaseUrl: "http://localhost:3000",
      auth: { signInAnonymously: async () => ({ idToken: "guest-token" }) },
      fetch: fetchImpl,
      createWebSocket: () => mockSocket(),
      onChange: () => {},
    });

    await session.start();

    expect(session.getState().phase).toBe("error");
    expect(session.getState().hud.errorMessage).toBe("internal_error");
  });

  it("does not POST again when profession was already sent", async () => {
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
          workers: [{ id: "w1", profession: "hunter" }],
          privateBuildings: [],
          starterPackageGranted: true,
        }),
      });

    const session = createGameSession({
      apiBaseUrl: "http://localhost:3000",
      auth: { signInAnonymously: async () => ({ idToken: "guest-token" }) },
      fetch: fetchImpl,
      createWebSocket: () => mockSocket(),
      onChange: () => {},
    });

    await session.start();
    await session.pickProfession("hunter" as StarterTrioProfessionId);
    await session.pickProfession("hunter" as StarterTrioProfessionId);

    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("surfaces pickProfession connect failures on onboarding", async () => {
    const fetchImpl = jest
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: "profession_required" }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: "unauthorized" }),
      });

    const session = createGameSession({
      apiBaseUrl: "http://localhost:3000",
      auth: { signInAnonymously: async () => ({ idToken: "guest-token" }) },
      fetch: fetchImpl,
      createWebSocket: () => mockSocket(),
      onChange: () => {},
    });

    await session.start();
    await session.pickProfession("miner" as StarterTrioProfessionId);

    expect(session.getState().phase).toBe("onboarding");
    expect(session.getState().hud.errorMessage).toBe("unauthorized");
  });

  it("sends place_order over the sync WebSocket when connected", async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        playerId: "p1",
        crowns: 100,
        inventory: {},
        workers: [{ id: "w1", profession: "hunter" }],
        privateBuildings: [],
        starterPackageGranted: true,
      }),
    });

    const socket = mockSocket();
    const session = createGameSession({
      apiBaseUrl: "http://localhost:3000",
      auth: { signInAnonymously: async () => ({ idToken: "guest-token" }) },
      fetch: fetchImpl,
      createWebSocket: () => socket,
      onChange: () => {},
    });

    await session.start();
    socket.trigger("open");

    session.placeOrder({
      resourceId: "grain",
      side: "buy",
      price: 3,
      quantity: 1,
    });

    expect(socket.send).toHaveBeenCalledWith(
      JSON.stringify({
        kind: "place_order",
        resourceId: "grain",
        side: "buy",
        price: 3,
        quantity: 1,
      }),
    );
  });

  it("sends cancel_order over the sync WebSocket when connected", async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        playerId: "p1",
        crowns: 100,
        inventory: {},
        workers: [{ id: "w1", profession: "hunter" }],
        privateBuildings: [],
        starterPackageGranted: true,
      }),
    });

    const socket = mockSocket();
    const session = createGameSession({
      apiBaseUrl: "http://localhost:3000",
      auth: { signInAnonymously: async () => ({ idToken: "guest-token" }) },
      fetch: fetchImpl,
      createWebSocket: () => socket,
      onChange: () => {},
    });

    await session.start();
    socket.trigger("open");
    session.cancelOrder("order-42");

    expect(socket.send).toHaveBeenCalledWith(
      JSON.stringify({ kind: "cancel_order", orderId: "order-42" }),
    );
  });

  it("replaces open orders when a tick broadcast arrives", async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        playerId: "p1",
        crowns: 100,
        inventory: {},
        workers: [{ id: "w1", profession: "hunter" }],
        privateBuildings: [],
        starterPackageGranted: true,
      }),
    });

    const socket = mockSocket();
    const session = createGameSession({
      apiBaseUrl: "http://localhost:3000",
      auth: { signInAnonymously: async () => ({ idToken: "guest-token" }) },
      fetch: fetchImpl,
      createWebSocket: () => socket,
      onChange: () => {},
    });

    await session.start();
    socket.trigger("open");
    socket.trigger(
      "message",
      JSON.stringify({
        kind: "tick",
        tickId: 1,
        walletCrowns: 100,
        inventory: {},
        books: [],
        orders: [
          {
            id: "o1",
            resourceId: "grain",
            side: "sell",
            price: 6,
            quantity: 2,
          },
        ],
        assignments: [],
      }),
    );

    expect(session.getState().hud.orders).toEqual([
      {
        id: "o1",
        resourceId: "grain",
        side: "sell",
        price: 6,
        quantity: 2,
      },
    ]);
  });

  it("surfaces command_error from the sync WebSocket on the HUD", async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        playerId: "p1",
        crowns: 100,
        inventory: {},
        workers: [{ id: "w1", profession: "hunter" }],
        privateBuildings: [],
        starterPackageGranted: true,
      }),
    });

    const socket = mockSocket();
    const session = createGameSession({
      apiBaseUrl: "http://localhost:3000",
      auth: { signInAnonymously: async () => ({ idToken: "guest-token" }) },
      fetch: fetchImpl,
      createWebSocket: () => socket,
      onChange: () => {},
    });

    await session.start();
    socket.trigger("open");
    socket.trigger(
      "message",
      JSON.stringify({
        kind: "command_error",
        commandKind: "place_order",
        code: "insufficient_crowns",
      }),
    );

    expect(session.getState().hud.errorMessage).toBe(
      "place_order: insufficient_crowns",
    );
  });

  it("clears command errors when the next tick broadcast arrives", async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        playerId: "p1",
        crowns: 100,
        inventory: {},
        workers: [{ id: "w1", profession: "hunter" }],
        privateBuildings: [],
        starterPackageGranted: true,
      }),
    });

    const socket = mockSocket();
    const session = createGameSession({
      apiBaseUrl: "http://localhost:3000",
      auth: { signInAnonymously: async () => ({ idToken: "guest-token" }) },
      fetch: fetchImpl,
      createWebSocket: () => socket,
      onChange: () => {},
    });

    await session.start();
    socket.trigger("open");
    socket.trigger(
      "message",
      JSON.stringify({
        kind: "command_error",
        commandKind: "cancel_order",
        code: "order_not_found",
      }),
    );
    expect(session.getState().hud.errorMessage).toBe("cancel_order: order_not_found");

    socket.trigger(
      "message",
      JSON.stringify({
        kind: "tick",
        tickId: 2,
        walletCrowns: 100,
        inventory: {},
        books: [],
        orders: [],
        assignments: [],
      }),
    );

    expect(session.getState().hud.errorMessage).toBeNull();
  });

  it("applies each pool_buy command_ok in send order when buys overlap", async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        playerId: "p1",
        crowns: 100,
        inventory: {},
        workers: [{ id: "w1", profession: "hunter" }],
        privateBuildings: [],
        starterPackageGranted: true,
      }),
    });

    const socket = mockSocket();
    const session = createGameSession({
      apiBaseUrl: "http://localhost:3000",
      auth: { signInAnonymously: async () => ({ idToken: "guest-token" }) },
      fetch: fetchImpl,
      createWebSocket: () => socket,
      onChange: () => {},
    });

    await session.start();
    socket.trigger("open");

    session.poolBuy({ resourceId: "grain", quantity: 1 });
    session.poolBuy({ resourceId: "game", quantity: 1 });

    socket.trigger(
      "message",
      JSON.stringify({ kind: "command_ok", commandKind: "pool_buy" }),
    );
    expect(session.getState().hud.walletCrowns).toBe(97);
    expect(session.getState().hud.inventory).toEqual({ grain: 1 });

    socket.trigger(
      "message",
      JSON.stringify({ kind: "command_ok", commandKind: "pool_buy" }),
    );
    expect(session.getState().hud.walletCrowns).toBe(93);
    expect(session.getState().hud.inventory).toEqual({ grain: 1, game: 1 });
    expect(session.getState().pendingPoolBuys).toEqual([]);
  });

  it("drops the oldest pending pool buy when pool_buy command_error arrives", async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        playerId: "p1",
        crowns: 100,
        inventory: {},
        workers: [{ id: "w1", profession: "hunter" }],
        privateBuildings: [],
        starterPackageGranted: true,
      }),
    });

    const socket = mockSocket();
    const session = createGameSession({
      apiBaseUrl: "http://localhost:3000",
      auth: { signInAnonymously: async () => ({ idToken: "guest-token" }) },
      fetch: fetchImpl,
      createWebSocket: () => socket,
      onChange: () => {},
    });

    await session.start();
    socket.trigger("open");

    session.poolBuy({ resourceId: "grain", quantity: 1 });
    session.poolBuy({ resourceId: "game", quantity: 1 });

    socket.trigger(
      "message",
      JSON.stringify({
        kind: "command_error",
        commandKind: "pool_buy",
        code: "insufficient_crowns",
      }),
    );

    expect(session.getState().hud.errorMessage).toBe("pool_buy: insufficient_crowns");
    expect(session.getState().hud.walletCrowns).toBe(100);
    expect(session.getState().pendingPoolBuys).toEqual([{ resourceId: "game", quantity: 1 }]);
  });

  it("refreshes private buildings from connect after purchase_private_building succeeds", async () => {
    const fetchImpl = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          playerId: "p1",
          crowns: 100,
          inventory: {},
          workers: [{ id: "w1", profession: "miner" }],
          privateBuildings: [],
          starterPackageGranted: true,
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          playerId: "p1",
          crowns: 20,
          inventory: {},
          workers: [{ id: "w1", profession: "miner" }],
          privateBuildings: [{ id: "b1", buildingTypeId: "mine" }],
          starterPackageGranted: true,
        }),
      });

    const socket = mockSocket();
    const session = createGameSession({
      apiBaseUrl: "http://localhost:3000",
      auth: { signInAnonymously: async () => ({ idToken: "guest-token" }) },
      fetch: fetchImpl,
      createWebSocket: () => socket,
      onChange: () => {},
    });

    await session.start();
    socket.trigger("open");
    session.purchasePrivateBuilding("mine");
    socket.trigger(
      "message",
      JSON.stringify({
        kind: "command_ok",
        commandKind: "purchase_private_building",
      }),
    );

    await new Promise<void>((resolve) => setImmediate(resolve));

    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(session.getState().hud.privateBuildings).toEqual([
      { id: "b1", buildingTypeId: "mine" },
    ]);
    expect(session.getState().hud.walletCrowns).toBe(20);
  });

  it("debits wallet optimistically when purchasing a private building", async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        playerId: "p1",
        crowns: 100,
        inventory: {},
        workers: [{ id: "w1", profession: "miner" }],
        privateBuildings: [],
        starterPackageGranted: true,
      }),
    });

    const socket = mockSocket();
    const session = createGameSession({
      apiBaseUrl: "http://localhost:3000",
      auth: { signInAnonymously: async () => ({ idToken: "guest-token" }) },
      fetch: fetchImpl,
      createWebSocket: () => socket,
      onChange: () => {},
    });

    await session.start();
    socket.trigger("open");
    session.purchasePrivateBuilding("mine");

    expect(session.getState().hud.walletCrowns).toBe(20);
  });

  it("updates wallet and inventory immediately when pool_buy succeeds", async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        playerId: "p1",
        crowns: 100,
        inventory: {},
        workers: [{ id: "w1", profession: "hunter" }],
        privateBuildings: [],
        starterPackageGranted: true,
      }),
    });

    const socket = mockSocket();
    const session = createGameSession({
      apiBaseUrl: "http://localhost:3000",
      auth: { signInAnonymously: async () => ({ idToken: "guest-token" }) },
      fetch: fetchImpl,
      createWebSocket: () => socket,
      onChange: () => {},
    });

    await session.start();
    socket.trigger("open");

    session.poolBuy({ resourceId: "grain", quantity: 2 });
    socket.trigger(
      "message",
      JSON.stringify({ kind: "command_ok", commandKind: "pool_buy" }),
    );

    expect(session.getState().hud.walletCrowns).toBe(94);
    expect(session.getState().hud.inventory).toEqual({ grain: 2 });
  });
});
