import { RESOURCE_IDS } from "@fantasy-economy-sim/domain";

import { marketResourceIds } from "./tradeable-resources";

describe("marketResourceIds", () => {
  it("lists all eight tradeable resources and excludes crown", () => {
    expect(marketResourceIds()).toHaveLength(8);
    expect(marketResourceIds()).toEqual([...RESOURCE_IDS]);
    expect(marketResourceIds()).not.toContain("crown");
  });
});
