import { describe, expect, it } from "vitest";

import {
  applyWorldDrip,
  isPoolResourceId,
  POOL_RESOURCE_IDS,
  WORLD_DRIP_PER_TICK,
} from "./supply-pool.js";

describe("world drip", () => {
  it("only affects tier 1–2 pool resources", () => {
    const next = applyWorldDrip({});

    for (const resourceId of POOL_RESOURCE_IDS) {
      expect(next[resourceId]).toBe(WORLD_DRIP_PER_TICK[resourceId]);
    }

    expect(next).not.toHaveProperty("ingots");
    expect(next).not.toHaveProperty("potions");
    expect(next).not.toHaveProperty("scrolls");
  });

  it("adds drip on top of existing pool stock", () => {
    expect(applyWorldDrip({ grain: 5, ore: 2 })).toEqual({
      grain: 5 + WORLD_DRIP_PER_TICK.grain,
      game: WORLD_DRIP_PER_TICK.game,
      lumber: WORLD_DRIP_PER_TICK.lumber,
      ore: 2 + WORLD_DRIP_PER_TICK.ore,
      herbs: WORLD_DRIP_PER_TICK.herbs,
    });
  });

  it("identifies pool resources vs market-only tiers", () => {
    expect(isPoolResourceId("grain")).toBe(true);
    expect(isPoolResourceId("ingots")).toBe(false);
  });
});
