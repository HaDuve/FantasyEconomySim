export const STARTER_TRIO_PROFESSION_IDS = [
  "hunter",
  "miner",
  "herbalist",
] as const;

export type StarterTrioProfessionId =
  (typeof STARTER_TRIO_PROFESSION_IDS)[number];

/** v1: onboarding professions only; widen when more roles ship. */
export type ProfessionId = StarterTrioProfessionId;

export function isProfessionId(value: unknown): value is ProfessionId {
  return (
    typeof value === "string" &&
    (STARTER_TRIO_PROFESSION_IDS as readonly string[]).includes(value)
  );
}
