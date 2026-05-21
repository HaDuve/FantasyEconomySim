import type { IncomingMessage } from "node:http";
import type { Server as HttpServer } from "node:http";
import { WebSocket, WebSocketServer } from "ws";

import type { CommandKind } from "@fantasy-economy-sim/domain";

import { InvalidIdTokenError } from "../auth/id-token-verifier.js";
import type { IdTokenVerifier } from "../auth/id-token-verifier.js";
import type { Db } from "../db/client.js";
import { getPlayerByFirebaseUid } from "../db/players.js";
import { listOpenOrders } from "../market/tick-auction.js";
import {
  buildResourceBookSnapshotsFromOrders,
  buildTickBroadcast,
} from "./build-tick-broadcast.js";
import {
  commandError,
  handleClientCommand,
  parseClientCommand,
} from "./handle-command.js";

export const SYNC_WEBSOCKET_PATH = "/sync";

export type SyncGatewayOptions = {
  db: Db;
  idTokenVerifier: IdTokenVerifier;
  path?: string;
};

export type SyncGateway = {
  attach(httpServer: HttpServer): void;
  broadcastTick(tickId: number): Promise<void>;
  close(): void;
};

type AuthenticatedSocket = WebSocket & { playerId: string };

function readBearerToken(request: IncomingMessage): string | undefined {
  const header = request.headers.authorization;

  if (header?.startsWith("Bearer ")) {
    return header.slice("Bearer ".length).trim();
  }

  try {
    const url = new URL(request.url ?? "", "http://localhost");
    const queryToken = url.searchParams.get("token")?.trim();
    return queryToken || undefined;
  } catch {
    return undefined;
  }
}

function isSyncPath(request: IncomingMessage, path: string): boolean {
  try {
    const url = new URL(request.url ?? "", "http://localhost");
    return url.pathname === path;
  } catch {
    return false;
  }
}

function wireCommandError(commandKind: CommandKind, code: string): string {
  return JSON.stringify(commandError(commandKind, code));
}

export function createSyncGateway(options: SyncGatewayOptions): SyncGateway {
  const path = options.path ?? SYNC_WEBSOCKET_PATH;
  const wss = new WebSocketServer({ noServer: true });
  const clients = new Map<string, Set<AuthenticatedSocket>>();

  function trackClient(playerId: string, socket: AuthenticatedSocket): void {
    const existing = clients.get(playerId) ?? new Set();
    existing.add(socket);
    clients.set(playerId, existing);

    socket.on("close", () => {
      existing.delete(socket);
      if (existing.size === 0) {
        clients.delete(playerId);
      }
    });
  }

  async function authenticate(
    request: IncomingMessage,
  ): Promise<{ playerId: string } | undefined> {
    const token = readBearerToken(request);

    if (!token) {
      return undefined;
    }

    try {
      const { uid } = await options.idTokenVerifier.verify(token);
      const player = await getPlayerByFirebaseUid(options.db, uid);

      if (!player?.starterPackageGranted) {
        return undefined;
      }

      return { playerId: player.id };
    } catch (error) {
      if (error instanceof InvalidIdTokenError) {
        return undefined;
      }

      throw error;
    }
  }

  wss.on("connection", (socket, request) => {
    const auth = (request as IncomingMessage & { syncAuth?: { playerId: string } })
      .syncAuth;

    if (!auth) {
      socket.close(1008, "unauthorized");
      return;
    }

    const authenticated = socket as AuthenticatedSocket;
    authenticated.playerId = auth.playerId;
    trackClient(auth.playerId, authenticated);

    // v1: serialize commands per socket so responses stay ordered.
    let commandChain = Promise.resolve();

    socket.on("message", (data) => {
      commandChain = commandChain
        .then(async () => {
          let body: unknown;

          try {
            body = JSON.parse(String(data));
          } catch {
            socket.send(wireCommandError("unknown", "invalid_json"));
            return;
          }

          const parsed = parseClientCommand(body);

          if (!parsed.ok) {
            socket.send(
              wireCommandError(parsed.commandKind, parsed.code),
            );
            return;
          }

          const response = await handleClientCommand(
            options.db,
            auth.playerId,
            parsed.command,
          );
          socket.send(JSON.stringify(response));
        })
        .catch((error) => {
          console.error("sync gateway command failed", {
            playerId: auth.playerId,
            error,
          });
          socket.send(wireCommandError("unknown", "internal_error"));
        });
    });
  });

  return {
    attach(httpServer: HttpServer) {
      httpServer.on("upgrade", (request, socket, head) => {
        if (!isSyncPath(request, path)) {
          return;
        }

        void (async () => {
          const auth = await authenticate(request);

          if (!auth) {
            socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
            socket.destroy();
            return;
          }

          (request as IncomingMessage & { syncAuth?: { playerId: string } }).syncAuth =
            auth;

          wss.handleUpgrade(request, socket, head, (ws) => {
            wss.emit("connection", ws, request);
          });
        })().catch(() => {
          socket.write("HTTP/1.1 500 Internal Server Error\r\n\r\n");
          socket.destroy();
        });
      });
    },

    async broadcastTick(tickId: number) {
      if (clients.size === 0) {
        return;
      }

      const openOrders = await listOpenOrders(options.db);
      const books = buildResourceBookSnapshotsFromOrders(openOrders);

      await Promise.all(
        [...clients.entries()].map(async ([playerId, sockets]) => {
          const message = await buildTickBroadcast(options.db, playerId, tickId, {
            books,
            openOrders,
          });
          const payload = JSON.stringify(message);

          for (const socket of sockets) {
            if (socket.readyState === WebSocket.OPEN) {
              socket.send(payload);
            }
          }
        }),
      );
    },

    close() {
      for (const sockets of clients.values()) {
        for (const socket of sockets) {
          socket.close();
        }
      }
      clients.clear();
      wss.close();
    },
  };
};

export type CreateServerWithSyncResult = {
  httpServer: HttpServer;
  syncGateway?: SyncGateway;
};
