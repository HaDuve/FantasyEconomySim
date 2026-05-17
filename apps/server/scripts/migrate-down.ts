import { readFileSync } from "node:fs";
import { Pool } from "pg";

import { loadRepoEnv } from "../src/db/env.js";
import { applyDownSql } from "../src/db/migrate.js";

loadRepoEnv();

const file = process.argv[2];
if (!file) {
  console.error("Usage: db:migrate:down -- <path-to.down.sql>");
  process.exit(1);
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const sql = readFileSync(file, "utf8");
const pool = new Pool({ connectionString });

try {
  await applyDownSql(pool, sql);
  console.log(`Applied down migration: ${file}`);
} finally {
  await pool.end();
}
