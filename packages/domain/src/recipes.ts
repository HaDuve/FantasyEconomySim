import type { ResourceId } from "./resources.js";

export type RecipeInputs = Partial<Record<ResourceId, number>>;

export const CONVERSION_RECIPES: Record<
  Extract<ResourceId, "ingots" | "potions" | "scrolls">,
  RecipeInputs
> = {
  ingots: { ore: 2 },
  potions: { herbs: 2, grain: 1 },
  scrolls: { ingots: 1, potions: 1, lumber: 1 },
};
