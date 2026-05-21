import type {
  InventorySnapshot,
  PrivateBuildingTypeId,
  StarterTrioProfessionId,
  WalletCrowns,
} from "@fantasy-economy-sim/domain";

export type ConnectGuestWorker = {
  id: string;
  profession: StarterTrioProfessionId;
};

export type ConnectGuestPrivateBuilding = {
  id: string;
  buildingTypeId: PrivateBuildingTypeId;
};

export type ConnectGuestResponse = {
  playerId: string;
  crowns: WalletCrowns;
  inventory: InventorySnapshot;
  workers: ConnectGuestWorker[];
  privateBuildings: ConnectGuestPrivateBuilding[];
  starterPackageGranted: boolean;
};

export async function postConnectGuest(
  apiBaseUrl: string,
  idToken: string,
  body: { profession?: StarterTrioProfessionId },
  fetchImpl: typeof fetch = fetch,
): Promise<ConnectGuestResponse> {
  const response = await fetchImpl(`${apiBaseUrl}/auth/connect`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${idToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => ({}))) as {
      error?: string;
    };
    throw new ConnectGuestError(response.status, errorBody.error ?? "connect_failed");
  }

  return (await response.json()) as ConnectGuestResponse;
}

export class ConnectGuestError extends Error {
  readonly name = "ConnectGuestError";

  constructor(
    readonly status: number,
    readonly code: string,
  ) {
    super(code);
  }
}
