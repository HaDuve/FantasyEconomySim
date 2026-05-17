/** Crown balance in the **wallet**; not a tradeable **resource**. */
export type WalletCrowns = number;

export function isWalletCrowns(value: unknown): value is WalletCrowns {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

export function assertWalletCrowns(
  value: number,
): asserts value is WalletCrowns {
  if (!isWalletCrowns(value)) {
    throw new Error(`Invalid wallet crowns: ${value}`);
  }
}

export function toWalletCrowns(value: number): WalletCrowns {
  assertWalletCrowns(value);
  return value;
}
