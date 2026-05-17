import { eq } from "drizzle-orm";

import type { Db } from "./client.js";
import { players } from "./schema.js";

export type Player = typeof players.$inferSelect;

export async function registerPlayer(
  db: Db,
  input: { firebaseUid?: string | null } = {},
): Promise<Player> {
  const [row] = await db
    .insert(players)
    .values({ firebaseUid: input.firebaseUid ?? null })
    .returning();

  if (!row) {
    throw new Error("Failed to register player");
  }

  return row;
}

export async function getPlayerById(
  db: Db,
  playerId: string,
): Promise<Player | undefined> {
  const [row] = await db
    .select()
    .from(players)
    .where(eq(players.id, playerId))
    .limit(1);

  return row;
}

export async function getPlayerByFirebaseUid(
  db: Db,
  firebaseUid: string,
): Promise<Player | undefined> {
  const [row] = await db
    .select()
    .from(players)
    .where(eq(players.firebaseUid, firebaseUid))
    .limit(1);

  return row;
}
