import type { ExtractTablesWithRelations } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import type { NodePgQueryResultHKT } from "drizzle-orm/node-postgres";
import type { PgTransaction } from "drizzle-orm/pg-core";
import { Pool, type PoolClient } from "pg";

import * as schema from "./schema.js";

type Schema = typeof schema;
type SchemaRelations = ExtractTablesWithRelations<Schema>;

export type Db = ReturnType<typeof createDb>;
export type DbTransaction = PgTransaction<
  NodePgQueryResultHKT,
  Schema,
  SchemaRelations
>;
/** Database or in-flight transaction — use for ledger writes that must compose. */
export type DbExecutor = Db | DbTransaction;

export function createDb(connectionStringOrPool: string | Pool) {
  const pool =
    typeof connectionStringOrPool === "string"
      ? new Pool({ connectionString: connectionStringOrPool })
      : connectionStringOrPool;

  return drizzle({ client: pool, schema });
}

/** Drizzle bound to one pool client — use for session-scoped work (e.g. advisory locks). */
export function createDbFromClient(client: PoolClient) {
  return drizzle({ client, schema });
}
