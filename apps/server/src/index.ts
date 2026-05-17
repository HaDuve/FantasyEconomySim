import { Pool } from "pg";

import { createDb } from "./db/client.js";
import { runMigrations } from "./db/migrate.js";
import { createServer } from "./server.js";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

const pool = new Pool({ connectionString: databaseUrl });
await runMigrations(pool);

const port = Number(process.env.PORT ?? 3000);
const server = createServer({ pool });

server.listen(port, () => {
  console.log(`server listening on http://localhost:${port}`);
});
