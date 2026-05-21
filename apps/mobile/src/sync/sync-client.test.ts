import { attachSyncClient, type SyncSocket } from "./sync-client";

function mockSocket(): SyncSocket & { triggerMessage: (data: string) => void } {
  let onmessage: ((event: { data: string }) => void) | null = null;

  return {
    readyState: 1,
    onopen: null,
    get onmessage() {
      return onmessage;
    },
    set onmessage(handler) {
      onmessage = handler;
    },
    onclose: null,
    onerror: null,
    close: jest.fn(),
    triggerMessage(data) {
      onmessage?.({ data });
    },
  };
}

describe("attachSyncClient", () => {
  it("forwards tick broadcasts to onTick", () => {
    const socket = mockSocket();
    const onTick = jest.fn();

    attachSyncClient(socket, { onTick });
    socket.triggerMessage(
      JSON.stringify({
        kind: "tick",
        tickId: 1,
        walletCrowns: 10,
        inventory: {},
        books: [],
        orders: [],
        assignments: [],
      }),
    );

    expect(onTick).toHaveBeenCalledTimes(1);
  });

  it("forwards command_error to onCommandError", () => {
    const socket = mockSocket();
    const onCommandError = jest.fn();

    attachSyncClient(socket, { onCommandError });
    socket.triggerMessage(
      JSON.stringify({
        kind: "command_error",
        commandKind: "place_order",
        code: "insufficient_crowns",
      }),
    );

    expect(onCommandError).toHaveBeenCalledWith({
      kind: "command_error",
      commandKind: "place_order",
      code: "insufficient_crowns",
    });
  });
});
