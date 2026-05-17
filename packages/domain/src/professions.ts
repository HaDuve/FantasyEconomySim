export const STARTER_TRIO_PROFESSION_IDS = [
  "hunter",
  "miner",
  "herbalist",
] as const;

export type StarterTrioProfessionId =
  (typeof STARTER_TRIO_PROFESSION_IDS)[number];

export type ProfessionId = StarterTrioProfessionId | string;
