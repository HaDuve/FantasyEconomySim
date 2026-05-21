import {
  isStarterTrioProfessionId,
  STARTER_PACKAGE_CROWNS,
  type PrivateBuildingTypeId,
  type StarterTrioProfessionId,
} from "@fantasy-economy-sim/domain";
import type { InventorySnapshot } from "@fantasy-economy-sim/domain";
import { eq } from "drizzle-orm";

import type { Db, DbExecutor } from "../db/client.js";
import { getInventory, getWallet, setWalletCrowns } from "../db/ledger.js";
import {
  ensurePlayerByFirebaseUid,
  getPlayerByFirebaseUid,
  getPlayerById,
} from "../db/players.js";
import { players } from "../db/schema.js";
import { getPrivateBuildings } from "../production/buildings.js";
import { getWorkers, hireWorker } from "../db/workers.js";
import { InvalidIdTokenError } from "./id-token-verifier.js";
import type { IdTokenVerifier } from "./id-token-verifier.js";

export class ProfessionRequiredError extends Error {
  readonly name = "ProfessionRequiredError";
}

export type ConnectGuestInput = {
  idToken: string;
  profession?: StarterTrioProfessionId;
};

export type ConnectGuestWorker = {
  id: string;
  profession: StarterTrioProfessionId;
};

export type ConnectGuestPrivateBuilding = {
  id: string;
  buildingTypeId: PrivateBuildingTypeId;
};

export type ConnectGuestResult = {
  playerId: string;
  crowns: number;
  inventory: InventorySnapshot;
  workers: ConnectGuestWorker[];
  privateBuildings: ConnectGuestPrivateBuilding[];
  starterPackageGranted: boolean;
};

async function loadConnectGuestResult(
  db: DbExecutor,
  playerId: string,
  starterPackageGranted: boolean,
): Promise<ConnectGuestResult> {
  const wallet = await getWallet(db, playerId);
  const workerRows = await getWorkers(db, playerId);
  const buildingRows = await getPrivateBuildings(db, playerId);

  return {
    playerId,
    crowns: wallet?.crowns ?? 0,
    inventory: await getInventory(db, playerId),
    workers: workerRows.map((worker) => ({
      id: worker.id,
      profession: worker.professionId as StarterTrioProfessionId,
    })),
    privateBuildings: buildingRows.map((building) => ({
      id: building.id,
      buildingTypeId: building.buildingTypeId as PrivateBuildingTypeId,
    })),
    starterPackageGranted,
  };
}

async function grantStarterPackage(
  db: DbExecutor,
  playerId: string,
  profession: StarterTrioProfessionId,
): Promise<void> {
  await setWalletCrowns(db, playerId, STARTER_PACKAGE_CROWNS);
  await hireWorker(db, playerId, profession);
  await db
    .update(players)
    .set({ starterPackageGranted: true })
    .where(eq(players.id, playerId));
}

async function ensureStarterPackageGranted(
  tx: DbExecutor,
  uid: string,
  profession: StarterTrioProfessionId,
): Promise<ConnectGuestResult> {
  const player = await ensurePlayerByFirebaseUid(tx, uid);

  if (!player.starterPackageGranted) {
    await grantStarterPackage(tx, player.id, profession);
  }

  const refreshed = await getPlayerById(tx, player.id);

  return loadConnectGuestResult(
    tx,
    player.id,
    refreshed?.starterPackageGranted ?? false,
  );
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

  if (existing?.starterPackageGranted) {
    return loadConnectGuestResult(db, existing.id, true);
  }

  if (existing && !existing.starterPackageGranted) {
    if (!input.profession || !isStarterTrioProfessionId(input.profession)) {
      return loadConnectGuestResult(db, existing.id, false);
    }

    return db.transaction((tx) =>
      ensureStarterPackageGranted(tx, uid, input.profession!),
    );
  }

  if (!input.profession || !isStarterTrioProfessionId(input.profession)) {
    throw new ProfessionRequiredError();
  }

  return db.transaction((tx) =>
    ensureStarterPackageGranted(tx, uid, input.profession!),
  );
}
