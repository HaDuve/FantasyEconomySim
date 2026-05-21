import { Pool } from "pg";

import { createDevIdTokenVerifier } from "./auth/dev-id-token-verifier.js";
import { createFirebaseIdTokenVerifier } from "./auth/firebase-id-token-verifier.js";
import { createDb } from "./db/client.js";
import { loadRepoEnv } from "./db/env.js";
import { runMigrations } from "./db/migrate.js";
import { createServer } from "./server.js";
import {
  DEFAULT_GLOBAL_TICK_INTERVAL_MS,
  startGlobalTickScheduler,
} from "./tick/tick-scheduler.js";

loadRepoEnv();

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

const pool = new Pool({ connectionString: databaseUrl });
await runMigrations(pool);

const idTokenVerifier =
  process.env.FIREBASE_AUTH_DISABLED === "true"
    ? createDevIdTokenVerifier()
    : createFirebaseIdTokenVerifier();

const port = Number(process.env.PORT ?? 3000);
const { httpServer, syncGateway } = createServer({ pool, idTokenVerifier });

const globalTickIntervalMs = Number(
  process.env.GLOBAL_TICK_INTERVAL_MS ?? DEFAULT_GLOBAL_TICK_INTERVAL_MS,
);

if (!Number.isFinite(globalTickIntervalMs) || globalTickIntervalMs <= 0) {
  throw new Error("GLOBAL_TICK_INTERVAL_MS must be a positive number");
}

const tickScheduler = startGlobalTickScheduler({
  pool,
  intervalMs: globalTickIntervalMs,
  onTickComplete: async (result) => {
    try {
      await syncGateway?.broadcastTick(result.tickId);
    } catch (error) {
      console.error("tick broadcast failed after successful global tick", {
        tickId: result.tickId,
        error,
      });
    }
  },
  onError: (error) => {
    console.error("global tick failed", error);
  },
});

httpServer.listen(port, () => {
  console.log(`server listening on http://localhost:${port}`);
  console.log(`global tick every ${globalTickIntervalMs}ms`);
});

function shutdown(): void {
  tickScheduler.stop();
  syncGateway?.close();
  httpServer.close(() => {
    void pool.end();
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
