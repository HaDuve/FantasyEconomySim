import type { PlaceOrderCommand } from "@fantasy-economy-sim/domain";

import { sendClientCommand } from "./send-client-command";
import { SYNC_OPEN, type SyncSocket } from "./sync-client";

function mockSocket(): SyncSocket & { sent: string[] } {
  const sent: string[] = [];
  return {
    readyState: SYNC_OPEN,
    onopen: null,
    onmessage: null,
    onclose: null,
    onerror: null,
    close: jest.fn(),
    send: (payload: string) => {
      sent.push(payload);
    },
    sent,
  };
}

describe("sendClientCommand", () => {
  it("serializes a place_order command on the sync WebSocket", () => {
    const socket = mockSocket();
    const command: PlaceOrderCommand = {
      kind: "place_order",
      resourceId: "grain",
      side: "buy",
      price: 4,
      quantity: 2,
    };

    sendClientCommand(socket, command);

    expect(socket.sent).toEqual([JSON.stringify(command)]);
  });
});
