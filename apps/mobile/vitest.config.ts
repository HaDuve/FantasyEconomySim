import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@fantasy-economy-sim/domain": path.resolve(
        __dirname,
        "../../packages/domain/src/index.ts",
      ),
    },
  },
  test: {
    include: ["src/**/*.test.ts"],
  },
});
