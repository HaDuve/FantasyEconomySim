export const STARTER_TRIO_PROFESSION_IDS = [
  "hunter",
  "miner",
  "herbalist",
] as const;

export type StarterTrioProfessionId =
  (typeof STARTER_TRIO_PROFESSION_IDS)[number];

/** v1: onboarding professions only; widen when more roles ship. */
export type ProfessionId = StarterTrioProfessionId;
