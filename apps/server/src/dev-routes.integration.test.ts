import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { runMigrations } from "./db/migrate.js";
import { createServer } from "./server.js";

describe("dev routes", () => {
  let container: Awaited<ReturnType<PostgreSqlContainer["start"]>>;
  let pool: Pool;
  let baseUrl = "";

  beforeAll(async () => {
    container = await new PostgreSqlContainer("postgres:16-alpine").start();
    pool = new Pool({ connectionString: container.getConnectionUri() });
    await runMigrations(pool);

    const server = createServer({ pool, enableDevRoutes: true });
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const address = server.address();
    const port =
      typeof address === "object" && address !== null ? address.port : 0;
    baseUrl = `http://127.0.0.1:${port}`;
  }, 120_000);

  afterAll(async () => {
    await pool?.end();
    await container?.stop();
  });

  it("creates a test player and reads wallet and inventory", async () => {
    const created = await fetch(`${baseUrl}/dev/players`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        crowns: 100,
        inventory: { grain: 3, ore: 1 },
      }),
    });

    expect(created.status).toBe(201);
    const { playerId } = (await created.json()) as { playerId: string };

    const ledger = await fetch(`${baseUrl}/dev/players/${playerId}/ledger`);
    expect(ledger.status).toBe(200);
    await expect(ledger.json()).resolves.toEqual({
      playerId,
      crowns: 100,
      inventory: { grain: 3, ore: 1 },
    });
  });

  it("rejects non-integer crowns with 400", async () => {
    const response = await fetch(`${baseUrl}/dev/players`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ crowns: 1.5 }),
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "invalid_body" });
  });

  it("rejects negative crowns with 400", async () => {
    const response = await fetch(`${baseUrl}/dev/players`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ crowns: -1 }),
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "invalid_body" });
  });

  it("rejects negative inventory quantity with 400", async () => {
    const response = await fetch(`${baseUrl}/dev/players`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ inventory: { grain: -1 } }),
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "invalid_body" });
  });

  it("is disabled in production even when a pool is provided", async () => {
    const previousNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";

    try {
      const server = createServer({ pool });
      await new Promise<void>((resolve) => server.listen(0, resolve));
      const address = server.address();
      const port =
        typeof address === "object" && address !== null ? address.port : 0;

      const response = await fetch(`http://127.0.0.1:${port}/dev/players`, {
        method: "POST",
      });

      expect(response.status).toBe(404);

      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
    } finally {
      if (previousNodeEnv === undefined) {
        delete process.env.NODE_ENV;
      } else {
        process.env.NODE_ENV = previousNodeEnv;
      }
    }
  });

  it("is disabled when dev routes are off", async () => {
    const server = createServer({ pool, enableDevRoutes: false });
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const address = server.address();
    const port =
      typeof address === "object" && address !== null ? address.port : 0;

    const response = await fetch(`http://127.0.0.1:${port}/dev/players`, {
      method: "POST",
    });

    expect(response.status).toBe(404);

    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  });
});
