import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "./schema.js";

export type Db = ReturnType<typeof createDb>;

export function createDb(connectionStringOrPool: string | Pool) {
  const pool =
    typeof connectionStringOrPool === "string"
      ? new Pool({ connectionString: connectionStringOrPool })
      : connectionStringOrPool;

  return drizzle({ client: pool, schema });
}
