import path from "node:path";
import { fileURLToPath } from "node:url";

export const migrationsFolder = path.join(
  fileURLToPath(new URL(".", import.meta.url)),
  "../../drizzle",
);
