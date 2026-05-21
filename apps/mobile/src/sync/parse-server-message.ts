import type { ServerMessage, TickBroadcast } from "@fantasy-economy-sim/domain";

function isTickBroadcast(value: unknown): value is TickBroadcast {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const message = value as TickBroadcast;
  return message.kind === "tick" && typeof message.tickId === "number";
}

export function parseServerMessage(raw: string): ServerMessage | undefined {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (isTickBroadcast(parsed)) {
      return parsed;
    }

    if (
      typeof parsed === "object" &&
      parsed !== null &&
      (parsed as { kind?: string }).kind === "command_error"
    ) {
      return parsed as ServerMessage;
    }

    if (
      typeof parsed === "object" &&
      parsed !== null &&
      (parsed as { kind?: string }).kind === "command_ok"
    ) {
      return parsed as ServerMessage;
    }

    return undefined;
  } catch {
    return undefined;
  }
}
