import path from "node:path";
import { fileURLToPath } from "node:url";

import { config } from "dotenv";

/** Repo-root `.env` (same path used by `drizzle.config.ts` and `db:migrate:down`). */
export const repoEnvPath = path.join(
  fileURLToPath(new URL(".", import.meta.url)),
  "../../../../.env",
);

export function loadRepoEnv(): void {
  config({ path: repoEnvPath });
}
