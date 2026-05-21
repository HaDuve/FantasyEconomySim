export const PLACE_ORDER_COOLDOWN_MS = 600;

export function canPlaceOrderNow(lastPlacedAtMs: number | null, nowMs: number): boolean {
  if (lastPlacedAtMs === null) {
    return true;
  }
  return nowMs - lastPlacedAtMs >= PLACE_ORDER_COOLDOWN_MS;
}
