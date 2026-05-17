import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const migrationsFolder = path.join(
  fileURLToPath(new URL(".", import.meta.url)),
  "../../drizzle",
);

function isDockerAvailable(): boolean {
  try {
    execSync("docker info", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

describe.skipIf(!isDockerAvailable())("postgres + drizzle migrations", () => {
  let container: Awaited<ReturnType<PostgreSqlContainer["start"]>>;

  beforeAll(async () => {
    container = await new PostgreSqlContainer("postgres:16-alpine").start();
  }, 120_000);

  afterAll(async () => {
    await container?.stop();
  });

  it("applies generated migrations", async () => {
    const pool = new Pool({ connectionString: container.getConnectionUri() });
    const db = drizzle({ client: pool });

    try {
      await migrate(db, { migrationsFolder });
      const result = await pool.query<{ ok: number }>("SELECT 1 AS ok");
      expect(result.rows[0]?.ok).toBe(1);
    } finally {
      await pool.end();
    }
  });
});
