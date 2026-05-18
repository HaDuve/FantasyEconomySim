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

  it("runs global tick via POST /dev/market/global-tick", async () => {
    const created = await fetch(`${baseUrl}/dev/players`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        crowns: 120,
        inventory: { grain: 20 },
      }),
    });
    const { playerId } = (await created.json()) as { playerId: string };

    const buyer = await fetch(`${baseUrl}/dev/players`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ crowns: 120 }),
    });
    const { playerId: buyerId } = (await buyer.json()) as { playerId: string };

    await fetch(`${baseUrl}/dev/players/${buyerId}/orders`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        resourceId: "grain",
        side: "buy",
        price: 12,
        quantity: 10,
      }),
    });
    await fetch(`${baseUrl}/dev/players/${playerId}/orders`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        resourceId: "grain",
        side: "sell",
        price: 10,
        quantity: 4,
      }),
    });

    const tick = await fetch(`${baseUrl}/dev/market/global-tick`, {
      method: "POST",
    });

    expect(tick.status).toBe(200);
    await expect(tick.json()).resolves.toEqual({
      fillsApplied: 1,
      fillsSkipped: 0,
    });
  });

  it("runs global tick via legacy POST /dev/market/tick-auction", async () => {
    const created = await fetch(`${baseUrl}/dev/players`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        crowns: 120,
        inventory: { grain: 20 },
      }),
    });
    const { playerId } = (await created.json()) as { playerId: string };

    const buyer = await fetch(`${baseUrl}/dev/players`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ crowns: 120 }),
    });
    const { playerId: buyerId } = (await buyer.json()) as { playerId: string };

    await fetch(`${baseUrl}/dev/players/${buyerId}/orders`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        resourceId: "grain",
        side: "buy",
        price: 12,
        quantity: 10,
      }),
    });
    await fetch(`${baseUrl}/dev/players/${playerId}/orders`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        resourceId: "grain",
        side: "sell",
        price: 10,
        quantity: 4,
      }),
    });

    const auction = await fetch(`${baseUrl}/dev/market/tick-auction`, {
      method: "POST",
    });

    expect(auction.status).toBe(200);
    await expect(auction.json()).resolves.toEqual({
      fillsApplied: 1,
      fillsSkipped: 0,
    });
  });

  it("pool buy via POST /dev/players/:id/pool-buy", async () => {
    const created = await fetch(`${baseUrl}/dev/players`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ crowns: 100 }),
    });
    const { playerId } = (await created.json()) as { playerId: string };

    await fetch(`${baseUrl}/dev/market/global-tick`, { method: "POST" });

    const buy = await fetch(`${baseUrl}/dev/players/${playerId}/pool-buy`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ resourceId: "grain", quantity: 2 }),
    });

    expect(buy.status).toBe(200);
    await expect(buy.json()).resolves.toEqual({
      resourceId: "grain",
      quantity: 2,
    });

    const ledger = await fetch(`${baseUrl}/dev/players/${playerId}/ledger`);
    await expect(ledger.json()).resolves.toMatchObject({
      crowns: 94,
      inventory: { grain: 2 },
    });
  });

  it("rejects invalid pool buy body via POST /dev/players/:id/pool-buy", async () => {
    const created = await fetch(`${baseUrl}/dev/players`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ crowns: 100 }),
    });
    const { playerId } = (await created.json()) as { playerId: string };

    const response = await fetch(`${baseUrl}/dev/players/${playerId}/pool-buy`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ resourceId: "ingots", quantity: 1 }),
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: "not_pool_resource",
    });
  });

  it("rejects over-committed sell via POST /dev/players/:id/orders", async () => {
    const created = await fetch(`${baseUrl}/dev/players`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        crowns: 0,
        inventory: { grain: 10 },
      }),
    });
    const { playerId } = (await created.json()) as { playerId: string };

    const first = await fetch(`${baseUrl}/dev/players/${playerId}/orders`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        resourceId: "grain",
        side: "sell",
        price: 5,
        quantity: 6,
      }),
    });
    expect(first.status).toBe(201);

    const second = await fetch(`${baseUrl}/dev/players/${playerId}/orders`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        resourceId: "grain",
        side: "sell",
        price: 5,
        quantity: 5,
      }),
    });

    expect(second.status).toBe(400);
    await expect(second.json()).resolves.toMatchObject({
      error: "insufficient_inventory",
    });
  });

  it("rejects over-committed buy via POST /dev/players/:id/orders", async () => {
    const created = await fetch(`${baseUrl}/dev/players`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ crowns: 100 }),
    });
    const { playerId } = (await created.json()) as { playerId: string };

    const first = await fetch(`${baseUrl}/dev/players/${playerId}/orders`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        resourceId: "grain",
        side: "buy",
        price: 10,
        quantity: 6,
      }),
    });
    expect(first.status).toBe(201);

    const second = await fetch(`${baseUrl}/dev/players/${playerId}/orders`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        resourceId: "ore",
        side: "buy",
        price: 10,
        quantity: 5,
      }),
    });

    expect(second.status).toBe(400);
    await expect(second.json()).resolves.toMatchObject({
      error: "insufficient_crowns",
    });
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
