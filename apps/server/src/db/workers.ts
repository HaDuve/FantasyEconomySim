import type { ProfessionId } from "@fantasy-economy-sim/domain";
import { eq } from "drizzle-orm";

import type { DbExecutor } from "./client.js";
import { workers } from "./schema.js";

export type Worker = typeof workers.$inferSelect;

export async function hireWorker(
  db: DbExecutor,
  playerId: string,
  professionId: ProfessionId,
): Promise<Worker> {
  const [row] = await db
    .insert(workers)
    .values({ playerId, professionId })
    .returning();

  if (!row) {
    throw new Error("Failed to hire worker");
  }

  return row;
}

export async function getWorkers(
  db: DbExecutor,
  playerId: string,
): Promise<Worker[]> {
  return db.select().from(workers).where(eq(workers.playerId, playerId));
}
