export type TickPhase = "worldDrip" | "production" | "tickAuction";

export class TickPhaseOrderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TickPhaseOrderError";
  }
}

const PHASE_RANK: Record<TickPhase, number> = {
  worldDrip: 1,
  production: 2,
  tickAuction: 3,
};

export class PhaseGuard {
  private lastRank = 0;

  enter(phase: TickPhase): void {
    const rank = PHASE_RANK[phase];

    if (rank <= this.lastRank) {
      throw new TickPhaseOrderError(
        `Tick phase ${phase} cannot run after phase rank ${this.lastRank}`,
      );
    }

    this.lastRank = rank;
  }
}
