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

type StartedPostgres = Awaited<ReturnType<PostgreSqlContainer["start"]>>;

function describeWithPostgres(
  suiteName: string,
  run: (connectionString: () => string) => void,
): void {
  describe(suiteName, () => {
    let container: StartedPostgres;
    let connectionString = "";

    beforeAll(async () => {
      container = await new PostgreSqlContainer("postgres:16-alpine").start();
      connectionString = container.getConnectionUri();
    }, 120_000);

    afterAll(async () => {
      await container?.stop();
    });

    run(() => connectionString);
  });
}

async function withMigratedDatabase<T>(
  connectionString: string,
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

describe("postgres persistence", () => {
  describeWithPostgres("after migrations", (getUri) => {
    it("registers a guest player", async () => {
      await withMigratedDatabase(getUri(), async ({ db }) => {
        const guest = await registerPlayer(db);

        const found = await getPlayerById(db, guest.id);

        expect(found).toEqual(guest);
        expect(found?.firebaseUid).toBeNull();
      });
    });

    it("registers an upgraded player by firebase uid", async () => {
      await withMigratedDatabase(getUri(), async ({ db }) => {
        const player = await registerPlayer(db, {
          firebaseUid: "firebase-uid-42",
        });

        const found = await getPlayerByFirebaseUid(db, "firebase-uid-42");

        expect(found).toEqual(player);
      });
    });

    it("applies migrations idempotently", async () => {
      const pool = new Pool({ connectionString: getUri() });

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
  });

  describeWithPostgres("paired down migration", (getUri) => {
    it("reverses schema so players cannot be registered", async () => {
      const pool = new Pool({ connectionString: getUri() });
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
});
