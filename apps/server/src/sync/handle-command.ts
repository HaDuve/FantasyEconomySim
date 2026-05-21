import {
  isAssignmentId,
  isPrivateBuildingTypeId,
  isResourceId,
  type ClientCommand,
  type CommandErrorMessage,
  type CommandOkMessage,
} from "@fantasy-economy-sim/domain";

import type { Db } from "../db/client.js";
import { isMarketError } from "../market/errors.js";
import { cancelOrder, placeOrder } from "../market/orders.js";
import { poolBuy } from "../market/supply-pool.js";
import { setAssignment } from "../production/assignments.js";
import { purchasePrivateBuilding } from "../production/buildings.js";
import { isProductionError } from "../production/errors.js";

function commandError(
  commandKind: ClientCommand["kind"],
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
        const unknown = command as { kind?: string };
        return commandError(
          (unknown.kind ?? "unknown") as ClientCommand["kind"],
          "unknown_command",
        );
      }
    }

    return commandOk(command.kind);
  } catch (error) {
    return commandError(command.kind, errorCode(error));
  }
}

export function parseClientCommand(body: unknown): ClientCommand | undefined {
  if (!body || typeof body !== "object" || !("kind" in body)) {
    return undefined;
  }

  const kind = (body as { kind: unknown }).kind;

  if (typeof kind !== "string") {
    return undefined;
  }

  return body as ClientCommand;
}
