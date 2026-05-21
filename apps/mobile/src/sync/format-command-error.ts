import type { CommandErrorMessage } from "@fantasy-economy-sim/domain";

export function formatCommandError(message: CommandErrorMessage): string {
  return `${message.commandKind}: ${message.code}`;
}
