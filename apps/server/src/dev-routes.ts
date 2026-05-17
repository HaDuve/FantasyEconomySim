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

function parsePlayerId(url: string): string | undefined {
  const match = /^\/dev\/players\/([^/]+)\/ledger$/.exec(url);

  return match?.[1];
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

export async function handleDevRoute(
  request: IncomingMessage,
  response: ServerResponse,
  db: Db,
): Promise<boolean> {
  const { method, url } = request;

  if (!url?.startsWith("/dev/")) {
    return false;
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
    const playerId = parsePlayerId(url);

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
