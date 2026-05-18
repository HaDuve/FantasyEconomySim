import {
  isProfessionId,
  STARTER_PACKAGE_CROWNS,
  type ProfessionId,
} from "@fantasy-economy-sim/domain";
import type { InventorySnapshot } from "@fantasy-economy-sim/domain";
import { eq } from "drizzle-orm";

import type { Db, DbExecutor } from "../db/client.js";
import { getInventory, getWallet, setWalletCrowns } from "../db/ledger.js";
import {
  getPlayerByFirebaseUid,
  getPlayerById,
  registerPlayer,
} from "../db/players.js";
import { players } from "../db/schema.js";
import { getWorkers, hireWorker } from "../db/workers.js";
import { InvalidIdTokenError } from "./id-token-verifier.js";
import type { IdTokenVerifier } from "./id-token-verifier.js";

export class ProfessionRequiredError extends Error {
  readonly name = "ProfessionRequiredError";
}

export type ConnectGuestInput = {
  idToken: string;
  profession?: ProfessionId;
};

export type ConnectGuestWorker = {
  profession: ProfessionId;
};

export type ConnectGuestResult = {
  playerId: string;
  crowns: number;
  inventory: InventorySnapshot;
  workers: ConnectGuestWorker[];
  starterPackageGranted: boolean;
};

async function loadConnectGuestResult(
  db: DbExecutor,
  playerId: string,
  starterPackageGranted: boolean,
): Promise<ConnectGuestResult> {
  const wallet = await getWallet(db, playerId);
  const workerRows = await getWorkers(db, playerId);

  return {
    playerId,
    crowns: wallet?.crowns ?? 0,
    inventory: await getInventory(db, playerId),
    workers: workerRows.map((worker) => ({
      profession: worker.professionId as ProfessionId,
    })),
    starterPackageGranted,
  };
}

async function grantStarterPackage(
  db: DbExecutor,
  playerId: string,
  profession: ProfessionId,
): Promise<void> {
  await setWalletCrowns(db, playerId, STARTER_PACKAGE_CROWNS);
  await hireWorker(db, playerId, profession);
  await db
    .update(players)
    .set({ starterPackageGranted: true })
    .where(eq(players.id, playerId));
}

export async function connectGuest(
  db: Db,
  verifier: IdTokenVerifier,
  input: ConnectGuestInput,
): Promise<ConnectGuestResult> {
  let uid: string;

  try {
    ({ uid } = await verifier.verify(input.idToken));
  } catch (error) {
    if (error instanceof InvalidIdTokenError) {
      throw error;
    }

    throw new InvalidIdTokenError();
  }

  const existing = await getPlayerByFirebaseUid(db, uid);

  if (existing) {
    return loadConnectGuestResult(
      db,
      existing.id,
      existing.starterPackageGranted,
    );
  }

  if (!input.profession || !isProfessionId(input.profession)) {
    throw new ProfessionRequiredError();
  }

  const profession = input.profession;

  return db.transaction(async (tx) => {
    let player = await getPlayerByFirebaseUid(tx, uid);

    if (!player) {
      try {
        player = await registerPlayer(tx, { firebaseUid: uid });
        await grantStarterPackage(tx, player.id, profession);
      } catch (error) {
        if (!isUniqueViolation(error)) {
          throw error;
        }

        player = await getPlayerByFirebaseUid(tx, uid);
        if (!player) {
          throw error;
        }
      }
    }

    const refreshed = await getPlayerById(tx, player.id);

    return loadConnectGuestResult(
      tx,
      player.id,
      refreshed?.starterPackageGranted ?? false,
    );
  });
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23505"
  );
}
