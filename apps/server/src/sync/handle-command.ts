import {
  isAssignmentId,
  isPrivateBuildingTypeId,
  isResourceId,
  type ClientCommand,
  type CommandErrorMessage,
  type CommandKind,
  type CommandOkMessage,
  type ResourceId,
} from "@fantasy-economy-sim/domain";

import type { Db } from "../db/client.js";
import { isMarketError } from "../market/errors.js";
import { cancelOrder, placeOrder } from "../market/orders.js";
import { poolBuy } from "../market/supply-pool.js";
import { setAssignment } from "../production/assignments.js";
import { purchasePrivateBuilding } from "../production/buildings.js";
import { isProductionError } from "../production/errors.js";

export type ParseClientCommandResult =
  | { ok: true; command: ClientCommand }
  | { ok: false; commandKind: CommandKind; code: "invalid_command" };

const CLIENT_COMMAND_KINDS = [
  "place_order",
  "cancel_order",
  "pool_buy",
  "set_assignment",
  "purchase_private_building",
] as const satisfies readonly ClientCommand["kind"][];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

function isOrderSide(value: unknown): value is "buy" | "sell" {
  return value === "buy" || value === "sell";
}

function isKnownResourceId(value: unknown): value is ResourceId {
  return typeof value === "string" && isResourceId(value);
}

function parseFailure(
  commandKind: CommandKind,
): Extract<ParseClientCommandResult, { ok: false }> {
  return { ok: false, commandKind, code: "invalid_command" };
}

export function commandError(
  commandKind: CommandKind,
  code: string,
): CommandErrorMessage {
  return { kind: "command_error", commandKind, code };
}

function commandOk(commandKind: ClientCommand["kind"]): CommandOkMessage {
  return { kind: "command_ok", commandKind };
}

function errorCode(error: unknown): string {
  if (isMarketError(error) || isProductionError(error)) {
    return error.code;
  }

  return "invalid_command";
}

export async function handleClientCommand(
  db: Db,
  playerId: string,
  command: ClientCommand,
): Promise<CommandOkMessage | CommandErrorMessage> {
  try {
    switch (command.kind) {
      case "place_order": {
        if (!isResourceId(command.resourceId)) {
          return commandError(command.kind, "invalid_resource");
        }

        await placeOrder(db, playerId, {
          resourceId: command.resourceId,
          side: command.side,
          price: command.price,
          quantity: command.quantity,
        });
        break;
      }
      case "cancel_order": {
        await cancelOrder(db, playerId, command.orderId);
        break;
      }
      case "pool_buy": {
        if (!isResourceId(command.resourceId)) {
          return commandError(command.kind, "invalid_resource");
        }

        await poolBuy(db, playerId, command.resourceId, command.quantity);
        break;
      }
      case "set_assignment": {
        if (!isAssignmentId(command.assignmentId)) {
          return commandError(command.kind, "invalid_assignment");
        }

        await setAssignment(
          db,
          playerId,
          command.workerId,
          command.assignmentId,
          command.buildingId,
        );
        break;
      }
      case "purchase_private_building": {
        if (!isPrivateBuildingTypeId(command.buildingTypeId)) {
          return commandError(command.kind, "invalid_building");
        }

        await purchasePrivateBuilding(db, playerId, command.buildingTypeId);
        break;
      }
      default: {
        return commandError("unknown", "unknown_command");
      }
    }

    return commandOk(command.kind);
  } catch (error) {
    return commandError(command.kind, errorCode(error));
  }
}

export function parseClientCommand(body: unknown): ParseClientCommandResult {
  if (!isRecord(body) || !("kind" in body)) {
    return parseFailure("unknown");
  }

  const kind = body.kind;

  if (
    typeof kind !== "string" ||
    !(CLIENT_COMMAND_KINDS as readonly string[]).includes(kind)
  ) {
    return parseFailure("unknown");
  }

  switch (kind) {
    case "place_order": {
      if (
        !isKnownResourceId(body.resourceId) ||
        !isOrderSide(body.side) ||
        !isPositiveInteger(body.price) ||
        !isPositiveInteger(body.quantity)
      ) {
        return parseFailure("place_order");
      }

      return {
        ok: true,
        command: {
          kind: "place_order",
          resourceId: body.resourceId,
          side: body.side,
          price: body.price,
          quantity: body.quantity,
        },
      };
    }
    case "cancel_order": {
      if (!isNonEmptyString(body.orderId)) {
        return parseFailure("cancel_order");
      }

      return {
        ok: true,
        command: { kind: "cancel_order", orderId: body.orderId },
      };
    }
    case "pool_buy": {
      if (
        !isKnownResourceId(body.resourceId) ||
        !isPositiveInteger(body.quantity)
      ) {
        return parseFailure("pool_buy");
      }

      return {
        ok: true,
        command: {
          kind: "pool_buy",
          resourceId: body.resourceId,
          quantity: body.quantity,
        },
      };
    }
    case "set_assignment": {
      if (
        !isNonEmptyString(body.workerId) ||
        !isNonEmptyString(body.assignmentId) ||
        !isAssignmentId(body.assignmentId)
      ) {
        return parseFailure("set_assignment");
      }

      const command: ClientCommand = {
        kind: "set_assignment",
        workerId: body.workerId,
        assignmentId: body.assignmentId,
      };

      if (body.buildingId !== undefined) {
        if (!isNonEmptyString(body.buildingId)) {
          return parseFailure("set_assignment");
        }

        command.buildingId = body.buildingId;
      }

      return { ok: true, command };
    }
    case "purchase_private_building": {
      if (
        !isNonEmptyString(body.buildingTypeId) ||
        !isPrivateBuildingTypeId(body.buildingTypeId)
      ) {
        return parseFailure("purchase_private_building");
      }

      return {
        ok: true,
        command: {
          kind: "purchase_private_building",
          buildingTypeId: body.buildingTypeId,
        },
      };
    }
    default:
      return parseFailure("unknown");
  }
}
