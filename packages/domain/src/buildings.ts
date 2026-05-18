/** v1 **private building** types (CONTEXT). */
export const PRIVATE_BUILDING_TYPE_IDS = [
  "herbalist_shop",
  "mine",
  "mill",
  "sawmill",
  "smithy",
  "alchemy",
] as const;

export type PrivateBuildingTypeId = (typeof PRIVATE_BUILDING_TYPE_IDS)[number];

/** v1 **public building** types (CONTEXT). */
export const PUBLIC_BUILDING_TYPE_IDS = ["magic_school"] as const;

export type PublicBuildingTypeId = (typeof PUBLIC_BUILDING_TYPE_IDS)[number];

export type BuildingTypeId = PrivateBuildingTypeId | PublicBuildingTypeId;

export const PRIVATE_BUILDING_COSTS: Record<PrivateBuildingTypeId, number> = {
  herbalist_shop: 80,
  mine: 80,
  mill: 100,
  sawmill: 100,
  smithy: 150,
  alchemy: 150,
};

/** **Facility fee** per **global tick** for **public building** use (v1 tuning). */
export const PUBLIC_BUILDING_FACILITY_FEES: Record<PublicBuildingTypeId, number> =
  {
    magic_school: 15,
  };

export function isPrivateBuildingTypeId(
  value: unknown,
): value is PrivateBuildingTypeId {
  return (
    typeof value === "string" &&
    (PRIVATE_BUILDING_TYPE_IDS as readonly string[]).includes(value)
  );
}

export function isPublicBuildingTypeId(
  value: unknown,
): value is PublicBuildingTypeId {
  return (
    typeof value === "string" &&
    (PUBLIC_BUILDING_TYPE_IDS as readonly string[]).includes(value)
  );
}

export function getPrivateBuildingCost(
  buildingTypeId: PrivateBuildingTypeId,
): number {
  return PRIVATE_BUILDING_COSTS[buildingTypeId];
}
