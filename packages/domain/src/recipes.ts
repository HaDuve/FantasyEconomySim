import type { ResourceId } from "./resources.js";

export type RecipeInputs = Partial<Record<ResourceId, number>>;

export type ConversionOutputId = Extract<
  ResourceId,
  "ingots" | "potions" | "scrolls"
>;

/** Inputs consumed and output produced per global tick (CONTEXT v1). */
export type ConversionRecipe = {
  inputs: RecipeInputs;
  /** Output units when the assignment runs on a global tick (v1: always 1). */
  outputPerGlobalTick: 1;
};

export const CONVERSION_RECIPES: Record<
  ConversionOutputId,
  ConversionRecipe
> = {
  ingots: { inputs: { ore: 2 }, outputPerGlobalTick: 1 },
  potions: { inputs: { herbs: 2, grain: 1 }, outputPerGlobalTick: 1 },
  scrolls: {
    inputs: { ingots: 1, potions: 1, lumber: 1 },
    outputPerGlobalTick: 1,
  },
};
