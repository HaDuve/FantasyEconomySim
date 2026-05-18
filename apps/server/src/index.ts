import { Pool } from "pg";

import { createDevIdTokenVerifier } from "./auth/dev-id-token-verifier.js";
import { createFirebaseIdTokenVerifier } from "./auth/firebase-id-token-verifier.js";
import { createDb } from "./db/client.js";
import { loadRepoEnv } from "./db/env.js";
import { runMigrations } from "./db/migrate.js";
import { createServer } from "./server.js";

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
const server = createServer({ pool, idTokenVerifier });

server.listen(port, () => {
  console.log(`server listening on http://localhost:${port}`);
});
