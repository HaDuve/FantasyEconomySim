import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { loadRepoEnv, repoEnvPath } from "./env.js";

describe("loadRepoEnv", () => {
  const previousDatabaseUrl = process.env.DATABASE_URL;

  afterEach(() => {
    if (previousDatabaseUrl === undefined) {
      delete process.env.DATABASE_URL;
    } else {
      process.env.DATABASE_URL = previousDatabaseUrl;
    }
  });

  it("resolves repo-root .env next to compose.yml", () => {
    const repoRoot = path.dirname(repoEnvPath);

    expect(existsSync(repoEnvPath)).toBe(true);
    expect(existsSync(path.join(repoRoot, "compose.yml"))).toBe(true);
    expect(readFileSync(repoEnvPath, "utf8")).toContain("DATABASE_URL=");
  });

  it("loads DATABASE_URL from repo-root .env when unset", () => {
    delete process.env.DATABASE_URL;

    loadRepoEnv();

    expect(process.env.DATABASE_URL).toMatch(/\/fes_dev$/);
  });
});
