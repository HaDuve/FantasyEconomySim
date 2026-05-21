import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { Pool } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { createDevIdTokenVerifier } from "./auth/dev-id-token-verifier.js";
import { InvalidIdTokenError } from "./auth/id-token-verifier.js";
import type { IdTokenVerifier } from "./auth/id-token-verifier.js";
import { createDb } from "./db/client.js";
import { runMigrations } from "./db/migrate.js";
import { registerPlayer } from "./db/players.js";
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
    const { httpServer: server } = createServer({ pool, idTokenVerifier: verifier });
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

  it("accepts dev:<uid> tokens for local guest connect", async () => {
    const { httpServer: devServer } = createServer({
      pool,
      idTokenVerifier: createDevIdTokenVerifier(),
    });
    await new Promise<void>((resolve) => devServer.listen(0, resolve));
    const address = devServer.address();
    const port =
      typeof address === "object" && address !== null ? address.port : 0;
    const devBaseUrl = `http://127.0.0.1:${port}`;

    try {
      const response = await fetch(`${devBaseUrl}/auth/connect`, {
        method: "POST",
        headers: {
          authorization: "Bearer dev:local-guest-1",
          "content-type": "application/json",
        },
        body: JSON.stringify({ profession: "herbalist" }),
      });

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual({
        playerId: expect.any(String),
        crowns: 100,
        inventory: {},
        workers: [{ profession: "herbalist" }],
        starterPackageGranted: true,
      });
    } finally {
      await new Promise<void>((resolve, reject) =>
        devServer.close((error) => (error ? reject(error) : resolve())),
      );
    }
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

  it("grants starter package exactly once when two first connects race", async () => {
    vi.mocked(verifier.verify).mockResolvedValue({ uid: "guest-race" });

    const request = () =>
      fetch(`${baseUrl}/auth/connect`, {
        method: "POST",
        headers: {
          authorization: "Bearer guest-token",
          "content-type": "application/json",
        },
        body: JSON.stringify({ profession: "hunter" }),
      });

    const [first, second] = await Promise.all([request(), request()]);

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);

    const firstBody = (await first.json()) as {
      playerId: string;
      crowns: number;
      workers: { profession: string }[];
      starterPackageGranted: boolean;
    };
    const secondBody = (await second.json()) as typeof firstBody;

    expect(firstBody.playerId).toBe(secondBody.playerId);
    expect(firstBody.crowns).toBe(100);
    expect(secondBody.crowns).toBe(100);
    expect(firstBody.workers).toEqual([{ profession: "hunter" }]);
    expect(secondBody.workers).toEqual([{ profession: "hunter" }]);
    expect(firstBody.starterPackageGranted).toBe(true);
    expect(secondBody.starterPackageGranted).toBe(true);
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

  it("returns starterPackageGranted false until profession is sent after incomplete grant", async () => {
    const player = await registerPlayer(createDb(pool), {
      firebaseUid: "guest-stranded",
    });
    vi.mocked(verifier.verify).mockResolvedValue({ uid: "guest-stranded" });

    const incomplete = await fetch(`${baseUrl}/auth/connect`, {
      method: "POST",
      headers: {
        authorization: "Bearer guest-token",
        "content-type": "application/json",
      },
      body: JSON.stringify({}),
    });

    expect(incomplete.status).toBe(200);
    await expect(incomplete.json()).resolves.toEqual({
      playerId: player.id,
      crowns: 0,
      inventory: {},
      workers: [],
      starterPackageGranted: false,
    });

    const complete = await fetch(`${baseUrl}/auth/connect`, {
      method: "POST",
      headers: {
        authorization: "Bearer guest-token",
        "content-type": "application/json",
      },
      body: JSON.stringify({ profession: "miner" }),
    });

    expect(complete.status).toBe(200);
    await expect(complete.json()).resolves.toEqual({
      playerId: player.id,
      crowns: 100,
      inventory: {},
      workers: [{ profession: "miner" }],
      starterPackageGranted: true,
    });
  });
});
