import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { Pool } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { InvalidIdTokenError } from "./auth/id-token-verifier.js";
import type { IdTokenVerifier } from "./auth/id-token-verifier.js";
import { runMigrations } from "./db/migrate.js";
import { createServer } from "./server.js";

describe("auth routes", () => {
  let container: Awaited<ReturnType<PostgreSqlContainer["start"]>>;
  let pool: Pool;
  let baseUrl = "";
  let verifier: IdTokenVerifier;

  beforeAll(async () => {
    container = await new PostgreSqlContainer("postgres:16-alpine").start();
    pool = new Pool({ connectionString: container.getConnectionUri() });
    await runMigrations(pool);

    verifier = { verify: vi.fn() };
    const server = createServer({ pool, idTokenVerifier: verifier });
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

  beforeEach(() => {
    vi.mocked(verifier.verify).mockReset();
  });

  it("rejects invalid or expired firebase token with 401", async () => {
    vi.mocked(verifier.verify).mockRejectedValueOnce(new InvalidIdTokenError());

    const response = await fetch(`${baseUrl}/auth/connect`, {
      method: "POST",
      headers: {
        authorization: "Bearer bad-token",
        "content-type": "application/json",
      },
      body: JSON.stringify({ profession: "hunter" }),
    });

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "invalid_token" });
  });

  it("requires a starter trio profession on first connect", async () => {
    vi.mocked(verifier.verify).mockResolvedValueOnce({ uid: "guest-no-profession" });

    const response = await fetch(`${baseUrl}/auth/connect`, {
      method: "POST",
      headers: {
        authorization: "Bearer guest-token",
        "content-type": "application/json",
      },
      body: JSON.stringify({}),
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "profession_required",
    });
  });

  it("grants starter package on first guest connect", async () => {
    vi.mocked(verifier.verify).mockResolvedValueOnce({ uid: "guest-first" });

    const response = await fetch(`${baseUrl}/auth/connect`, {
      method: "POST",
      headers: {
        authorization: "Bearer guest-token",
        "content-type": "application/json",
      },
      body: JSON.stringify({ profession: "miner" }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      playerId: expect.any(String),
      crowns: 100,
      inventory: {},
      workers: [{ profession: "miner" }],
      starterPackageGranted: true,
    });
  });

  it("does not re-grant starter package when the same guest reconnects", async () => {
    vi.mocked(verifier.verify).mockResolvedValue({ uid: "guest-returning" });

    const first = await fetch(`${baseUrl}/auth/connect`, {
      method: "POST",
      headers: {
        authorization: "Bearer guest-token",
        "content-type": "application/json",
      },
      body: JSON.stringify({ profession: "hunter" }),
    });
    expect(first.status).toBe(200);
    const firstBody = (await first.json()) as {
      playerId: string;
      crowns: number;
      workers: { profession: string }[];
    };

    const second = await fetch(`${baseUrl}/auth/connect`, {
      method: "POST",
      headers: {
        authorization: "Bearer guest-token",
        "content-type": "application/json",
      },
      body: JSON.stringify({}),
    });

    expect(second.status).toBe(200);
    await expect(second.json()).resolves.toEqual({
      playerId: firstBody.playerId,
      crowns: 100,
      inventory: {},
      workers: [{ profession: "hunter" }],
      starterPackageGranted: true,
    });
    expect(verifier.verify).toHaveBeenCalledTimes(2);
  });
});
