export const STARTER_TRIO_PROFESSION_IDS = [
  "hunter",
  "miner",
  "herbalist",
] as const;

export type StarterTrioProfessionId =
  (typeof STARTER_TRIO_PROFESSION_IDS)[number];

export const PROFESSION_IDS = [
  ...STARTER_TRIO_PROFESSION_IDS,
  "miller",
  "sawyer",
  "smith",
  "alchemist",
  "scholar",
] as const;

/** v1 production **professions**. */
export type ProfessionId = (typeof PROFESSION_IDS)[number];

export function isStarterTrioProfessionId(
  value: unknown,
): value is StarterTrioProfessionId {
  return (
    typeof value === "string" &&
    (STARTER_TRIO_PROFESSION_IDS as readonly string[]).includes(value)
  );
}

export function isProfessionId(value: unknown): value is ProfessionId {
  return (
    typeof value === "string" &&
    (PROFESSION_IDS as readonly string[]).includes(value)
  );
}
