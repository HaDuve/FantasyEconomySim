import type { ResourceId } from "@fantasy-economy-sim/domain";
import { isResourceId, isWalletCrowns } from "@fantasy-economy-sim/domain";
import type { IncomingMessage, ServerResponse } from "node:http";

import type { Db } from "./db/client.js";
import {
  createPlayerWithLedger,
  getInventory,
  getWallet,
} from "./db/ledger.js";
import { getPlayerById } from "./db/players.js";
import { isMarketError } from "./market/errors.js";
import { cancelOrder, placeOrder, type PlaceOrderInput } from "./market/orders.js";
import { runGlobalTick } from "./market/supply-pool.js";

type DevCreateBody = {
  firebaseUid?: string | null;
  crowns?: number;
  inventory?: Partial<Record<ResourceId, number>>;
};

function readJsonBody(request: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];

    request.on("data", (chunk: Buffer) => chunks.push(chunk));
    request.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8");

      if (!raw) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(raw));
      } catch (error) {
        reject(error);
      }
    });
    request.on("error", reject);
  });
}

function sendJson(
  response: ServerResponse,
  status: number,
  body: unknown,
): void {
  response.writeHead(status, { "content-type": "application/json" });
  response.end(JSON.stringify(body));
}

function parseLedgerPlayerId(url: string): string | undefined {
  const match = /^\/dev\/players\/([^/]+)\/ledger$/.exec(url);

  return match?.[1];
}

function parseOrdersPlayerId(url: string): string | undefined {
  const match = /^\/dev\/players\/([^/]+)\/orders$/.exec(url);

  return match?.[1];
}

function parseCancelOrderPath(
  url: string,
): { playerId: string; orderId: string } | undefined {
  const match = /^\/dev\/players\/([^/]+)\/orders\/([^/]+)$/.exec(url);

  if (!match) {
    return undefined;
  }

  return { playerId: match[1]!, orderId: match[2]! };
}

function isDevCreateBody(value: unknown): value is DevCreateBody {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const body = value as DevCreateBody;

  if (
    body.firebaseUid !== undefined &&
    body.firebaseUid !== null &&
    typeof body.firebaseUid !== "string"
  ) {
    return false;
  }

  if (body.crowns !== undefined && !isWalletCrowns(body.crowns)) {
    return false;
  }

  if (body.inventory !== undefined) {
    if (typeof body.inventory !== "object" || body.inventory === null) {
      return false;
    }

    for (const [resourceId, quantity] of Object.entries(body.inventory)) {
      if (
        !isResourceId(resourceId) ||
        typeof quantity !== "number" ||
        quantity < 0
      ) {
        return false;
      }
    }
  }

  return true;
}

function isPlaceOrderBody(value: unknown): value is PlaceOrderInput {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const body = value as PlaceOrderInput;

  return (
    isResourceId(body.resourceId) &&
    (body.side === "buy" || body.side === "sell") &&
    Number.isInteger(body.price) &&
    body.price > 0 &&
    Number.isInteger(body.quantity) &&
    body.quantity > 0
  );
}

function sendMarketError(response: ServerResponse, error: unknown): void {
  if (isMarketError(error)) {
    sendJson(response, 400, { error: error.code, message: error.message });
    return;
  }

  sendJson(response, 500, { error: "internal_error" });
}

export async function handleDevRoute(
  request: IncomingMessage,
  response: ServerResponse,
  db: Db,
): Promise<boolean> {
  const { method, url } = request;

  if (!url?.startsWith("/dev/")) {
    return false;
  }

  if (method === "POST" && url === "/dev/market/tick-auction") {
    try {
      const result = await runGlobalTick(db);
      sendJson(response, 200, result);
    } catch (error) {
      sendMarketError(response, error);
    }

    return true;
  }

  if (method === "POST") {
    const playerId = parseOrdersPlayerId(url);

    if (playerId) {
      try {
        const player = await getPlayerById(db, playerId);

        if (!player) {
          sendJson(response, 404, { error: "not_found" });
          return true;
        }

        const body = await readJsonBody(request);

        if (!isPlaceOrderBody(body)) {
          sendJson(response, 400, { error: "invalid_body" });
          return true;
        }

        const order = await placeOrder(db, playerId, body);
        sendJson(response, 201, { order });
      } catch (error) {
        sendMarketError(response, error);
      }

      return true;
    }
  }

  if (method === "DELETE") {
    const cancelPath = parseCancelOrderPath(url);

    if (cancelPath) {
      try {
        const player = await getPlayerById(db, cancelPath.playerId);

        if (!player) {
          sendJson(response, 404, { error: "not_found" });
          return true;
        }

        await cancelOrder(db, cancelPath.playerId, cancelPath.orderId);
        response.writeHead(204);
        response.end();
      } catch (error) {
        sendMarketError(response, error);
      }

      return true;
    }
  }

  if (method === "POST" && url === "/dev/players") {
    try {
      const body = await readJsonBody(request);

      if (!isDevCreateBody(body)) {
        sendJson(response, 400, { error: "invalid_body" });
        return true;
      }

      const created = await createPlayerWithLedger(db, {
        firebaseUid: body.firebaseUid ?? null,
        crowns: body.crowns,
        inventory: body.inventory,
      });

      sendJson(response, 201, { playerId: created.playerId });
    } catch {
      sendJson(response, 500, { error: "internal_error" });
    }

    return true;
  }

  if (method === "GET") {
    const playerId = parseLedgerPlayerId(url);

    if (!playerId) {
      sendJson(response, 404, { error: "not_found" });
      return true;
    }

    const player = await getPlayerById(db, playerId);

    if (!player) {
      sendJson(response, 404, { error: "not_found" });
      return true;
    }

    const wallet = await getWallet(db, playerId);
    const inventory = await getInventory(db, playerId);

    sendJson(response, 200, {
      playerId,
      crowns: wallet?.crowns ?? 0,
      inventory,
    });

    return true;
  }

  sendJson(response, 405, { error: "method_not_allowed" });
  return true;
}
