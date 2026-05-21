import { RESOURCE_IDS, type ResourceId } from "@fantasy-economy-sim/domain";

/** Resources offered on the global market (crown is wallet-only). */
export function marketResourceIds(): readonly ResourceId[] {
  return RESOURCE_IDS;
}
