import { defineConfig } from "drizzle-kit";

import { loadRepoEnv } from "./src/db/env.js";

loadRepoEnv();

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
