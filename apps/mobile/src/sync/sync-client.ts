import type { CommandErrorMessage, CommandOkMessage } from "@fantasy-economy-sim/domain";

import { parseServerMessage } from "./parse-server-message";

export type SyncSocket = {
  readyState: number;
  onopen: ((event: unknown) => void) | null;
  onmessage: ((event: { data: string }) => void) | null;
  onclose: ((event: unknown) => void) | null;
  onerror: ((event: unknown) => void) | null;
  close(): void;
  send?(payload: string): void;
};

export type SyncClientHandlers = {
  onOpen?: () => void;
  onTick?: (raw: string) => void;
  onCommandOk?: (ok: CommandOkMessage) => void;
  onCommandError?: (error: CommandErrorMessage) => void;
  onClose?: () => void;
  onError?: () => void;
};

export type CreateWebSocket = (url: string) => SyncSocket;

export const SYNC_OPEN = 1;

export function buildSyncWebSocketUrl(apiBaseUrl: string, idToken: string): string {
  const base = apiBaseUrl.replace(/\/$/, "");
  const wsBase = base.replace(/^http/, "ws");
  return `${wsBase}/sync?token=${encodeURIComponent(idToken)}`;
}

export function attachSyncClient(
  socket: SyncSocket,
  handlers: SyncClientHandlers,
): () => void {
  socket.onopen = () => {
    handlers.onOpen?.();
  };

  socket.onmessage = (event) => {
    const message = parseServerMessage(event.data);
    if (message?.kind === "tick") {
      handlers.onTick?.(event.data);
      return;
    }
    if (message?.kind === "command_ok") {
      handlers.onCommandOk?.(message);
      return;
    }
    if (message?.kind === "command_error") {
      handlers.onCommandError?.(message);
    }
  };

  socket.onclose = () => {
    handlers.onClose?.();
  };

  socket.onerror = () => {
    handlers.onError?.();
  };

  return () => socket.close();
}

export type SyncConnection = {
  close: () => void;
  socket: SyncSocket;
};

export function openSyncClient(
  apiBaseUrl: string,
  idToken: string,
  handlers: SyncClientHandlers,
  createWebSocket: CreateWebSocket,
): SyncConnection {
  const socket = createWebSocket(buildSyncWebSocketUrl(apiBaseUrl, idToken));
  return {
    socket,
    close: attachSyncClient(socket, handlers),
  };
}

export function createBrowserWebSocket(url: string): SyncSocket {
  return new WebSocket(url) as unknown as SyncSocket;
}
