import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.integration.test.ts"],
    globalSetup: ["src/test/integration-global-setup.ts"],
    testTimeout: 120_000,
    hookTimeout: 120_000,
  },
});
