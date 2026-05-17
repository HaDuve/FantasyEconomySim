import { readFileSync } from "node:fs";
import path from "node:path";

import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createDb } from "./client.js";
import { applyDownSql, runMigrations } from "./migrate.js";
import { migrationsFolder } from "./paths.js";
import {
  getPlayerByFirebaseUid,
  getPlayerById,
  registerPlayer,
} from "./players.js";

const firstDownMigration = path.join(
  migrationsFolder,
  "down/0000_zippy_tattoo.down.sql",
);

describe("postgres persistence", () => {
  let container: Awaited<ReturnType<PostgreSqlContainer["start"]>>;
  let connectionString: string;

  beforeAll(async () => {
    container = await new PostgreSqlContainer("postgres:16-alpine").start();
    connectionString = container.getConnectionUri();
  }, 120_000);

  afterAll(async () => {
    await container?.stop();
  });

  async function withMigratedDatabase<T>(
    run: (ctx: { pool: Pool; db: ReturnType<typeof createDb> }) => Promise<T>,
  ): Promise<T> {
    const pool = new Pool({ connectionString });

    try {
      await runMigrations(pool);
      const db = createDb(pool);
      return await run({ pool, db });
    } finally {
      await pool.end();
    }
  }

  it("registers a guest player after migrations", async () => {
    await withMigratedDatabase(async ({ db }) => {
      const guest = await registerPlayer(db);

      const found = await getPlayerById(db, guest.id);

      expect(found).toEqual(guest);
      expect(found?.firebaseUid).toBeNull();
    });
  });

  it("registers an upgraded player by firebase uid", async () => {
    await withMigratedDatabase(async ({ db }) => {
      const player = await registerPlayer(db, {
        firebaseUid: "firebase-uid-42",
      });

      const found = await getPlayerByFirebaseUid(db, "firebase-uid-42");

      expect(found).toEqual(player);
    });
  });

  it("applies migrations idempotently", async () => {
    const pool = new Pool({ connectionString });

    try {
      await runMigrations(pool);
      await expect(runMigrations(pool)).resolves.toBeUndefined();

      const db = createDb(pool);
      const player = await registerPlayer(db);

      expect(await getPlayerById(db, player.id)).toEqual(player);
    } finally {
      await pool.end();
    }
  });

  it("reverses schema with a paired down migration", async () => {
    const pool = new Pool({ connectionString });
    const downSql = readFileSync(firstDownMigration, "utf8");

    try {
      await runMigrations(pool);
      const db = createDb(pool);
      await registerPlayer(db);

      await applyDownSql(pool, downSql);

      await expect(registerPlayer(createDb(pool))).rejects.toThrow();
    } finally {
      await pool.end();
    }
  });
});
