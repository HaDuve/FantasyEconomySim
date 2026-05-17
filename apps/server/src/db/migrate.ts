import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import type { Pool } from "pg";

import { migrationsFolder } from "./paths.js";

export async function runMigrations(pool: Pool): Promise<void> {
  const db = drizzle({ client: pool });
  await migrate(db, { migrationsFolder });
}

export async function applyDownSql(pool: Pool, sql: string): Promise<void> {
  await pool.query(sql);
}
