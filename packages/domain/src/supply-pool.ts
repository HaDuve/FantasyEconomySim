import type { ResourceId } from "./resources.js";

/** Tier 1–2 **resources** in the **supply pool** (CONTEXT v1). */
export const POOL_RESOURCE_IDS = [
  "grain",
  "game",
  "lumber",
  "ore",
  "herbs",
] as const;

export type PoolResourceId = (typeof POOL_RESOURCE_IDS)[number];

export type SupplyPoolSnapshot = Record<PoolResourceId, number>;

/** **World drip** quantity added per **global tick** (v1 tuning). */
export const WORLD_DRIP_PER_TICK: SupplyPoolSnapshot = {
  grain: 20,
  game: 15,
  lumber: 15,
  ore: 8,
  herbs: 8,
};

/** Fixed **pool price** in **crowns** per unit (v1 tuning). */
export const POOL_PRICES: SupplyPoolSnapshot = {
  grain: 3,
  game: 4,
  lumber: 4,
  ore: 8,
  herbs: 10,
};

export function isPoolResourceId(
  resourceId: ResourceId,
): resourceId is PoolResourceId {
  return (POOL_RESOURCE_IDS as readonly string[]).includes(resourceId);
}

/** Pure **world drip**: tier 1–2 pool stock only. */
export function applyWorldDrip(
  current: Partial<SupplyPoolSnapshot>,
): SupplyPoolSnapshot {
  const next = {} as SupplyPoolSnapshot;

  for (const resourceId of POOL_RESOURCE_IDS) {
    next[resourceId] =
      (current[resourceId] ?? 0) + WORLD_DRIP_PER_TICK[resourceId];
  }

  return next;
}

export function getPoolPrice(resourceId: PoolResourceId): number {
  return POOL_PRICES[resourceId];
}
