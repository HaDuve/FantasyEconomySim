import { PostgreSqlContainer } from "@testcontainers/postgresql";
import WebSocket from "ws";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  STARTER_PACKAGE_CROWNS,
  WORKER_UPKEEP_PER_TICK,
  type ClientCommand,
  type ServerMessage,
  type TickBroadcast,
} from "@fantasy-economy-sim/domain";

import { connectGuest } from "../auth/connect-guest.js";
import { createDevIdTokenVerifier } from "../auth/dev-id-token-verifier.js";
import { createDb } from "../db/client.js";
import {
  getInventory,
  getWallet,
  setInventoryQuantity,
} from "../db/ledger.js";
import { runMigrations } from "../db/migrate.js";
import { registerPlayer } from "../db/players.js";
import { getWorkers, hireWorker } from "../db/workers.js";
import { listOpenOrders } from "../market/tick-auction.js";
import { runWorldDrip } from "../market/supply-pool.js";
import { getPrivateBuildings } from "../production/buildings.js";
import { createTickEngine, getCurrentTickId } from "../tick/tick-engine.js";
import { startGlobalTickScheduler } from "../tick/tick-scheduler.js";
import { createServer } from "../server.js";

const SYNC_PATH = "/sync";
const verifier = createDevIdTokenVerifier();

function wsUrl(port: number, token?: string): string {
  const query = token ? `?token=${encodeURIComponent(token)}` : "";
  return `ws://127.0.0.1:${port}${SYNC_PATH}${query}`;
}

function waitForMessage<T extends ServerMessage["kind"]>(
  ws: WebSocket,
  kind: T,
  timeoutMs = 10_000,
): Promise<Extract<ServerMessage, { kind: T }>> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Timed out waiting for ${kind}`));
    }, timeoutMs);

    ws.on("message", (data) => {
      const message = JSON.parse(String(data)) as ServerMessage;
      if (message.kind === kind) {
        clearTimeout(timer);
        resolve(message as Extract<ServerMessage, { kind: T }>);
      }
    });
  });
}

function attemptSyncUpgrade(
  port: number,
  token?: string,
): Promise<{ statusCode: number }> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl(port, token));

    ws.once("unexpected-response", (_request, response) => {
      resolve({ statusCode: response.statusCode });
    });

    ws.once("open", () => {
      ws.close();
      reject(new Error("Expected WebSocket upgrade to be rejected"));
    });

    ws.once("error", (error) => {
      reject(error);
    });
  });
}

function connectSync(port: number, token?: string): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl(port, token));
    ws.once("open", () => resolve(ws));
    ws.once("error", reject);
    ws.once("close", () => {
      if (ws.readyState !== WebSocket.OPEN) {
        reject(new Error("WebSocket closed before open"));
      }
    });
  });
}

async function connectGuestAndOpenWs(
  db: ReturnType<typeof createDb>,
  port: number,
  uid: string,
  profession: "hunter" | "miner" | "herbalist" = "hunter",
): Promise<{ token: string; ws: WebSocket; playerId: string }> {
  const token = `dev:${uid}`;
  const connected = await connectGuest(db, verifier, {
    idToken: token,
    profession,
  });
  const ws = await connectSync(port, token);
  return { token, ws, playerId: connected.playerId };
}

describe("sync gateway", () => {
  let container: Awaited<ReturnType<PostgreSqlContainer["start"]>>;
  let pool: Pool;
  let port = 0;
  let httpServer: ReturnType<typeof createServer>["httpServer"];
  let syncGateway: ReturnType<typeof createServer>["syncGateway"];

  beforeAll(async () => {
    container = await new PostgreSqlContainer("postgres:16-alpine").start();
    pool = new Pool({ connectionString: container.getConnectionUri() });
    await runMigrations(pool);

    const created = createServer({
      pool,
      idTokenVerifier: verifier,
      enableDevRoutes: true,
    });
    httpServer = created.httpServer;
    syncGateway = created.syncGateway;

    await new Promise<void>((resolve) => httpServer.listen(0, resolve));
    const address = httpServer.address();
    port =
      typeof address === "object" && address !== null ? address.port : 0;
  }, 120_000);

  afterAll(async () => {
    syncGateway?.close();
    await new Promise<void>((resolve, reject) =>
      httpServer.close((error) => (error ? reject(error) : resolve())),
    );
    await pool?.end();
    await container?.stop();
  }, 30_000);

  it("rejects unauthenticated WebSocket connections with HTTP 401 on upgrade", async () => {
    await expect(attemptSyncUpgrade(port)).resolves.toEqual({ statusCode: 401 });
  });

  it("rejects invalid tokens with HTTP 401 on upgrade", async () => {
    await expect(attemptSyncUpgrade(port, "not-a-dev-token")).resolves.toEqual({
      statusCode: 401,
    });
  });

  it("rejects WebSocket connect before HTTP connect grants the starter package with HTTP 401", async () => {
    const db = createDb(pool);
    const uid = "ws-no-starter";
    await registerPlayer(db, { firebaseUid: uid });

    await expect(attemptSyncUpgrade(port, `dev:${uid}`)).resolves.toEqual({
      statusCode: 401,
    });
  });

  it("broadcasts tick snapshots to authenticated clients after a global tick", async () => {
    const db = createDb(pool);
    const { ws } = await connectGuestAndOpenWs(db, port, "ws-tick-broadcast");

    await createTickEngine(pool).runTick();
    await syncGateway!.broadcastTick(await getCurrentTickId(db));

    const broadcast = await waitForMessage(ws, "tick");
    expect(broadcast.tickId).toBeGreaterThan(0);
    expect(broadcast.walletCrowns).toBe(
      STARTER_PACKAGE_CROWNS - WORKER_UPKEEP_PER_TICK,
    );
    expect(broadcast.books.length).toBeGreaterThan(0);
    expect(broadcast.orders).toEqual([]);
    expect(broadcast.assignments).toEqual([]);

    ws.close();
  });

  it("pushes tick snapshots via the global tick scheduler onTickComplete hook", async () => {
    const db = createDb(pool);
    const { ws } = await connectGuestAndOpenWs(db, port, "ws-scheduler-tick");

    const scheduler = startGlobalTickScheduler({
      pool,
      intervalMs: 60_000,
      tickEngine: createTickEngine(pool),
      onTickComplete: (result) => syncGateway!.broadcastTick(result.tickId),
    });

    const broadcast = await waitForMessage(ws, "tick");
    scheduler.stop();

    expect(broadcast.tickId).toBeGreaterThan(0);
    expect(broadcast.walletCrowns).toBe(
      STARTER_PACKAGE_CROWNS - WORKER_UPKEEP_PER_TICK,
    );

    ws.close();
  });

  it("returns command_error for malformed place_order without creating orders", async () => {
    const db = createDb(pool);
    const { ws, playerId } = await connectGuestAndOpenWs(
      db,
      port,
      "ws-malformed-order",
    );

    const ordersBefore = (await listOpenOrders(db)).filter(
      (order) => order.playerId === playerId,
    ).length;

    ws.send(JSON.stringify({ kind: "place_order", resourceId: "grain" }));

    const error = await waitForMessage(ws, "command_error");
    expect(error.commandKind).toBe("place_order");
    expect(error.code).toBe("invalid_command");

    const ordersAfter = (await listOpenOrders(db)).filter(
      (order) => order.playerId === playerId,
    ).length;
    expect(ordersAfter).toBe(ordersBefore);

    ws.close();
  });

  it("returns command_error for invalid place_order without changing wallet", async () => {
    const db = createDb(pool);
    const { ws, playerId } = await connectGuestAndOpenWs(
      db,
      port,
      "ws-invalid-order",
    );
    const before = await getWallet(db, playerId);

    const command: ClientCommand = {
      kind: "place_order",
      resourceId: "grain",
      side: "buy",
      price: 100,
      quantity: 50,
    };
    ws.send(JSON.stringify(command));

    const error = await waitForMessage(ws, "command_error");
    expect(error.commandKind).toBe("place_order");
    expect(error.code).toBe("insufficient_crowns");

    const after = await getWallet(db, playerId);
    expect(after?.crowns).toBe(before?.crowns);

    ws.close();
  });

  it("accepts valid place_order and includes the order on the next tick broadcast", async () => {
    const db = createDb(pool);
    const { ws } = await connectGuestAndOpenWs(db, port, "ws-valid-order");

    ws.send(
      JSON.stringify({
        kind: "place_order",
        resourceId: "grain",
        side: "buy",
        price: 5,
        quantity: 2,
      } satisfies ClientCommand),
    );

    const ok = await waitForMessage(ws, "command_ok");
    expect(ok.commandKind).toBe("place_order");

    await createTickEngine(pool).runTick();
    await syncGateway!.broadcastTick(await getCurrentTickId(db));

    const broadcast = (await waitForMessage(ws, "tick")) as TickBroadcast;
    expect(broadcast.orders).toEqual([
      expect.objectContaining({
        resourceId: "grain",
        side: "buy",
        price: 5,
        quantity: 2,
      }),
    ]);

    ws.close();
  });

  it("cancels an open order via cancel_order", async () => {
    const db = createDb(pool);
    const { ws, playerId } = await connectGuestAndOpenWs(
      db,
      port,
      "ws-cancel-order",
    );

    ws.send(
      JSON.stringify({
        kind: "place_order",
        resourceId: "grain",
        side: "buy",
        price: 4,
        quantity: 1,
      } satisfies ClientCommand),
    );
    await waitForMessage(ws, "command_ok");

    const [openOrder] = (await listOpenOrders(db)).filter(
      (order) => order.playerId === playerId,
    );
    expect(openOrder).toBeDefined();

    ws.send(
      JSON.stringify({
        kind: "cancel_order",
        orderId: openOrder!.id,
      } satisfies ClientCommand),
    );

    const cancelled = await waitForMessage(ws, "command_ok");
    expect(cancelled.commandKind).toBe("cancel_order");
    expect(
      (await listOpenOrders(db)).find((order) => order.id === openOrder!.id),
    ).toBeUndefined();

    ws.close();
  });

  it("applies pool_buy against the supply pool", async () => {
    const db = createDb(pool);
    const { ws, playerId } = await connectGuestAndOpenWs(db, port, "ws-pool-buy");

    await runWorldDrip(db);

    ws.send(
      JSON.stringify({
        kind: "pool_buy",
        resourceId: "grain",
        quantity: 2,
      } satisfies ClientCommand),
    );

    const ok = await waitForMessage(ws, "command_ok");
    expect(ok.commandKind).toBe("pool_buy");
    expect(await getInventory(db, playerId)).toEqual({ grain: 2 });

    ws.close();
  });

  it("purchases a private building via purchase_private_building", async () => {
    const db = createDb(pool);
    const { ws, playerId } = await connectGuestAndOpenWs(
      db,
      port,
      "ws-buy-building",
    );

    ws.send(
      JSON.stringify({
        kind: "purchase_private_building",
        buildingTypeId: "mine",
      } satisfies ClientCommand),
    );

    const ok = await waitForMessage(ws, "command_ok");
    expect(ok.commandKind).toBe("purchase_private_building");

    const buildings = await getPrivateBuildings(db, playerId);
    expect(buildings).toHaveLength(1);
    expect(buildings[0]?.buildingTypeId).toBe("mine");

    ws.close();
  });

  it("returns command_error for incompatible set_assignment without persisting", async () => {
    const db = createDb(pool);
    const { ws, playerId } = await connectGuestAndOpenWs(
      db,
      port,
      "ws-bad-assignment",
    );
    const [hunter] = await getWorkers(db, playerId);
    expect(hunter).toBeDefined();

    ws.send(
      JSON.stringify({
        kind: "set_assignment",
        workerId: hunter.id,
        assignmentId: "mine_ore",
      } satisfies ClientCommand),
    );

    const error = await waitForMessage(ws, "command_error");
    expect(error.commandKind).toBe("set_assignment");
    expect(error.code).toBe("incompatible_assignment");

    const { getWorkerAssignments } = await import("../production/assignments.js");
    expect(await getWorkerAssignments(db, playerId)).toEqual([]);

    ws.close();
  });

  it("returns public_building_seat_cap on the wire for a second Magic School assignment", async () => {
    const db = createDb(pool);
    const { ws, playerId } = await connectGuestAndOpenWs(db, port, "ws-seat-cap");

    await setInventoryQuantity(db, playerId, "ingots", 1);
    await setInventoryQuantity(db, playerId, "potions", 1);
    await setInventoryQuantity(db, playerId, "lumber", 1);

    const scholar = await hireWorker(db, playerId, "scholar");
    const secondScholar = await hireWorker(db, playerId, "scholar");

    ws.send(
      JSON.stringify({
        kind: "set_assignment",
        workerId: scholar.id,
        assignmentId: "scribe_scrolls",
      } satisfies ClientCommand),
    );
    await waitForMessage(ws, "command_ok");

    ws.send(
      JSON.stringify({
        kind: "set_assignment",
        workerId: secondScholar.id,
        assignmentId: "scribe_scrolls",
      } satisfies ClientCommand),
    );

    const error = await waitForMessage(ws, "command_error");
    expect(error.commandKind).toBe("set_assignment");
    expect(error.code).toBe("public_building_seat_cap");

    const { getWorkerAssignments } = await import("../production/assignments.js");
    const assignments = await getWorkerAssignments(db, playerId);
    expect(assignments).toHaveLength(1);
    expect(assignments[0]?.workerId).toBe(scholar.id);

    ws.close();
  });
});
