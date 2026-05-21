import type { ClientCommand } from "@fantasy-economy-sim/domain";

import { SYNC_OPEN, type SyncSocket } from "./sync-client";

export function sendClientCommand(
  socket: SyncSocket,
  command: ClientCommand,
): void {
  if (socket.readyState !== SYNC_OPEN || !socket.send) {
    throw new Error("sync_not_connected");
  }

  socket.send(JSON.stringify(command));
}
