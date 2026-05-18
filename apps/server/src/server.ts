import { createServer as createHttpServer } from "node:http";
import type { Pool } from "pg";

import { RESOURCE_IDS } from "@fantasy-economy-sim/domain";

import type { IdTokenVerifier } from "./auth/id-token-verifier.js";
import { handleAuthRoute } from "./auth-routes.js";
import { createDb } from "./db/client.js";
import { handleDevRoute } from "./dev-routes.js";

export type CreateServerOptions = {
  pool?: Pool;
  enableDevRoutes?: boolean;
  idTokenVerifier?: IdTokenVerifier;
};

export function createServer(options: CreateServerOptions = {}) {
  const db = options.pool ? createDb(options.pool) : undefined;
  const idTokenVerifier = options.idTokenVerifier;
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

    if (db && idTokenVerifier && request.url?.startsWith("/auth/")) {
      try {
        const handled = await handleAuthRoute(
          request,
          response,
          db,
          idTokenVerifier,
        );
        if (handled) {
          return;
        }
      } catch {
        response.writeHead(500, { "content-type": "application/json" });
        response.end(JSON.stringify({ error: "internal_error" }));
      }
    }

    if (devRoutesEnabled && db && options.pool && request.url?.startsWith("/dev/")) {
      try {
        await handleDevRoute(request, response, db, options.pool);
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
