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
import { getWallet } from "../db/ledger.js";
import { runMigrations } from "../db/migrate.js";
import { createTickEngine, getCurrentTickId } from "../tick/tick-engine.js";
import { createServer } from "../server.js";

const SYNC_PATH = "/sync";

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

    const verifier = createDevIdTokenVerifier();
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

  it("rejects unauthenticated WebSocket connections", async () => {
    await expect(connectSync(port)).rejects.toThrow();
  });

  it("broadcasts tick snapshots to authenticated clients after a global tick", async () => {
    const uid = "ws-tick-broadcast";
    const token = `dev:${uid}`;
    const db = createDb(pool);
    await connectGuest(db, createDevIdTokenVerifier(), {
      idToken: token,
      profession: "hunter",
    });

    const ws = await connectSync(port, token);
    const tickEngine = createTickEngine(pool);

    await tickEngine.runTick();
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

  it("returns command_error for invalid place_order without changing wallet", async () => {
    const uid = "ws-invalid-order";
    const token = `dev:${uid}`;
    const db = createDb(pool);
    const connected = await connectGuest(db, createDevIdTokenVerifier(), {
      idToken: token,
      profession: "hunter",
    });

    const ws = await connectSync(port, token);
    const before = await getWallet(db, connected.playerId);

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

    const after = await getWallet(db, connected.playerId);
    expect(after?.crowns).toBe(before?.crowns);

    ws.close();
  });

  it("accepts valid place_order and includes the order on the next tick broadcast", async () => {
    const uid = "ws-valid-order";
    const token = `dev:${uid}`;
    const db = createDb(pool);
    await connectGuest(db, createDevIdTokenVerifier(), {
      idToken: token,
      profession: "hunter",
    });

    const ws = await connectSync(port, token);

    const command: ClientCommand = {
      kind: "place_order",
      resourceId: "grain",
      side: "buy",
      price: 5,
      quantity: 2,
    };
    ws.send(JSON.stringify(command));

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

  it("returns command_error for incompatible set_assignment without persisting", async () => {
    const uid = "ws-bad-assignment";
    const token = `dev:${uid}`;
    const db = createDb(pool);
    const connected = await connectGuest(db, createDevIdTokenVerifier(), {
      idToken: token,
      profession: "hunter",
    });
    const [hunter] = await import("../db/workers.js").then((m) =>
      m.getWorkers(db, connected.playerId),
    );

    const ws = await connectSync(port, token);

    const command: ClientCommand = {
      kind: "set_assignment",
      workerId: hunter!.id,
      assignmentId: "mine_ore",
    };
    ws.send(JSON.stringify(command));

    const error = await waitForMessage(ws, "command_error");
    expect(error.commandKind).toBe("set_assignment");
    expect(error.code).toBe("incompatible_assignment");

    const assignments = await import("../production/assignments.js").then((m) =>
      m.getWorkerAssignments(db, connected.playerId),
    );
    expect(assignments).toEqual([]);

    ws.close();
  });
});
