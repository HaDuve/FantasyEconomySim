export class ProductionError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "ProductionError";
    this.code = code;
  }
}

export class InsufficientCrownsForBuildingError extends ProductionError {
  constructor() {
    super(
      "insufficient_crowns_for_building",
      "Insufficient crowns to purchase private building",
    );
  }
}

export class BuildingNotOwnedError extends ProductionError {
  constructor() {
    super("building_not_owned", "Private building not owned by player");
  }
}

export class WorkerNotOwnedError extends ProductionError {
  constructor() {
    super("worker_not_owned", "Worker not owned by player");
  }
}

export class IncompatibleAssignmentError extends ProductionError {
  constructor() {
    super("incompatible_assignment", "Assignment incompatible with worker or building");
  }
}

export class PublicBuildingSeatCapError extends ProductionError {
  constructor() {
    super("public_building_seat_cap", "Public building seat cap reached for player");
  }
}

export function isProductionError(error: unknown): error is ProductionError {
  return error instanceof ProductionError;
}
