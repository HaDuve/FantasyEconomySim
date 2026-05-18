import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { loadEnvFromPath, loadRepoEnv, repoEnvPath } from "./env.js";

const hasRepoEnvFile = existsSync(repoEnvPath);

describe("repo env", () => {
  const previousDatabaseUrl = process.env.DATABASE_URL;

  afterEach(() => {
    if (previousDatabaseUrl === undefined) {
      delete process.env.DATABASE_URL;
    } else {
      process.env.DATABASE_URL = previousDatabaseUrl;
    }
  });

  describe("repoEnvPath", () => {
    it("points at repo root beside compose.yml", () => {
      const repoRoot = path.dirname(repoEnvPath);

      expect(repoEnvPath).toBe(path.join(repoRoot, ".env"));
      expect(existsSync(path.join(repoRoot, "compose.yml"))).toBe(true);
      expect(
        readFileSync(path.join(repoRoot, ".env.example"), "utf8"),
      ).toContain("DATABASE_URL=");
    });
  });

  describe("loadEnvFromPath", () => {
    it("loads DATABASE_URL from an env file when unset", () => {
      const dir = mkdtempSync(path.join(tmpdir(), "fes-env-test-"));
      const envPath = path.join(dir, ".env");
      writeFileSync(
        envPath,
        "DATABASE_URL=postgres://fes:fes@localhost:5433/fes_dev\n",
      );

      delete process.env.DATABASE_URL;
      loadEnvFromPath(envPath);

      expect(process.env.DATABASE_URL).toMatch(/\/fes_dev$/);
    });
  });

  describe("loadRepoEnv", () => {
    it.skipIf(!hasRepoEnvFile)(
      "loads DATABASE_URL from repo-root .env when unset",
      () => {
        delete process.env.DATABASE_URL;

        loadRepoEnv();

        expect(process.env.DATABASE_URL).toMatch(/\/fes_dev$/);
      },
    );
  });
});
