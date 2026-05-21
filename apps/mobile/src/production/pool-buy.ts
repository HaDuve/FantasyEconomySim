import {
  getPoolPrice,
  isPoolResourceId,
  type PoolResourceId,
  type ResourceId,
} from "@fantasy-economy-sim/domain";

export type PoolBuyInput = {
  resourceId: ResourceId;
  quantity: number;
};

export function isValidPoolBuyInput(
  input: PoolBuyInput,
): input is { resourceId: PoolResourceId; quantity: number } {
  return (
    isPoolResourceId(input.resourceId) &&
    Number.isInteger(input.quantity) &&
    input.quantity > 0
  );
}

export function poolBuyCost(resourceId: PoolResourceId, quantity: number): number {
  return getPoolPrice(resourceId) * quantity;
}
