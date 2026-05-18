import { eq } from "drizzle-orm";

import type { DbExecutor } from "./client.js";
import { players } from "./schema.js";

export type Player = typeof players.$inferSelect;

export async function registerPlayer(
  db: DbExecutor,
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
  db: DbExecutor,
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
  db: DbExecutor,
  firebaseUid: string,
): Promise<Player | undefined> {
  const [row] = await db
    .select()
    .from(players)
    .where(eq(players.firebaseUid, firebaseUid))
    .limit(1);

  return row;
}

export async function lockPlayerByFirebaseUid(
  db: DbExecutor,
  firebaseUid: string,
): Promise<Player | undefined> {
  const [row] = await db
    .select()
    .from(players)
    .where(eq(players.firebaseUid, firebaseUid))
    .for("update")
    .limit(1);

  return row;
}

export async function lockPlayerById(
  db: DbExecutor,
  playerId: string,
): Promise<Player | undefined> {
  const [row] = await db
    .select()
    .from(players)
    .where(eq(players.id, playerId))
    .for("update")
    .limit(1);

  return row;
}

/** Insert-if-absent, then lock the row (safe under concurrent first connect). */
export async function ensurePlayerByFirebaseUid(
  db: DbExecutor,
  firebaseUid: string,
): Promise<Player> {
  await db
    .insert(players)
    .values({ firebaseUid })
    .onConflictDoNothing({ target: players.firebaseUid });

  const player = await lockPlayerByFirebaseUid(db, firebaseUid);

  if (!player) {
    throw new Error(`Failed to ensure player for firebase uid ${firebaseUid}`);
  }

  return player;
}
