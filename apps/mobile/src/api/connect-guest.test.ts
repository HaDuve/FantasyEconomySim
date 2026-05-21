import { ConnectGuestError, postConnectGuest } from "./connect-guest";

describe("postConnectGuest", () => {
  it("POSTs profession once to /auth/connect with the guest ID token", async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        playerId: "p1",
        crowns: 100,
        inventory: {},
        workers: [{ id: "w1", profession: "miner" }],
        privateBuildings: [],
        starterPackageGranted: true,
      }),
    });

    const result = await postConnectGuest(
      "http://localhost:3000",
      "token-abc",
      { profession: "miner" },
      fetchImpl,
    );

    expect(fetchImpl).toHaveBeenCalledWith(
      "http://localhost:3000/auth/connect",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          authorization: "Bearer token-abc",
        }),
        body: JSON.stringify({ profession: "miner" }),
      }),
    );
    expect(result.workers[0]?.profession).toBe("miner");
  });

  it("surfaces profession_required from the server", async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ error: "profession_required" }),
    });

    await expect(
      postConnectGuest("http://localhost:3000", "token", {}, fetchImpl),
    ).rejects.toMatchObject({ code: "profession_required" });
  });
});
