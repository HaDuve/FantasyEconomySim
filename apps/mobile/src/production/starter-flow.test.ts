import { buildStarterSetAssignment } from "./starter-flow";

describe("buildStarterSetAssignment", () => {
  it("returns field work for a hunter without a building", () => {
    expect(
      buildStarterSetAssignment(
        { id: "w1", profession: "hunter" },
        [],
      ),
    ).toEqual({
      workerId: "w1",
      assignmentId: "hunt_game",
    });
  });

  it("requires a mine before a miner can mine ore", () => {
    expect(
      buildStarterSetAssignment({ id: "w1", profession: "miner" }, []),
    ).toBeUndefined();

    expect(
      buildStarterSetAssignment(
        { id: "w1", profession: "miner" },
        [{ id: "b1", buildingTypeId: "mine" }],
      ),
    ).toEqual({
      workerId: "w1",
      assignmentId: "mine_ore",
      buildingId: "b1",
    });
  });
});
