import { createServer as createHttpServer } from "node:http";
import type { Pool } from "pg";

import { RESOURCE_IDS } from "@fantasy-economy-sim/domain";

import { createDb } from "./db/client.js";
import { handleDevRoute } from "./dev-routes.js";

export type CreateServerOptions = {
  pool?: Pool;
  enableDevRoutes?: boolean;
};

export function createServer(options: CreateServerOptions = {}) {
  const db = options.pool ? createDb(options.pool) : undefined;
  const devRoutesEnabled =
    options.enableDevRoutes ??
    process.env.NODE_ENV !== "production";

  return createHttpServer(async (request, response) => {
    if (request.method === "GET" && request.url === "/health") {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(
        JSON.stringify({ ok: true, resourceCount: RESOURCE_IDS.length }),
      );
      return;
    }

    if (devRoutesEnabled && db && request.url?.startsWith("/dev/")) {
      try {
        await handleDevRoute(request, response, db);
      } catch {
        response.writeHead(500, { "content-type": "application/json" });
        response.end(JSON.stringify({ error: "internal_error" }));
      }
      return;
    }

    response.writeHead(404, { "content-type": "application/json" });
    response.end(JSON.stringify({ error: "not_found" }));
  });
}
