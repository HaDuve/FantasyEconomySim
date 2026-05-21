import { parseServerMessage } from "./parse-server-message";

describe("parseServerMessage", () => {
  it("parses a tick broadcast from the sync WebSocket", () => {
    const message = parseServerMessage(
      JSON.stringify({
        kind: "tick",
        tickId: 3,
        walletCrowns: 95,
        inventory: { grain: 2 },
        books: [],
        orders: [],
        assignments: [],
      }),
    );

    expect(message?.kind).toBe("tick");
    if (message?.kind === "tick") {
      expect(message.tickId).toBe(3);
      expect(message.walletCrowns).toBe(95);
    }
  });
});
