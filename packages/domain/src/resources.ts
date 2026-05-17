export const RESOURCE_IDS = [
  "grain",
  "game",
  "lumber",
  "ore",
  "herbs",
  "ingots",
  "potions",
  "scrolls",
] as const;

export type ResourceId = (typeof RESOURCE_IDS)[number];

export function isResourceId(value: string): value is ResourceId {
  return (RESOURCE_IDS as readonly string[]).includes(value);
}
