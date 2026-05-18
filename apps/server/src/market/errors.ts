export class MarketError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = "MarketError";
  }
}

export class InsufficientCrownsError extends MarketError {
  constructor(message = "Insufficient crowns for buy order") {
    super("insufficient_crowns", message);
    this.name = "InsufficientCrownsError";
  }
}

export class InsufficientInventoryError extends MarketError {
  constructor(message = "Insufficient inventory for sell order") {
    super("insufficient_inventory", message);
    this.name = "InsufficientInventoryError";
  }
}

export class OrderNotFoundError extends MarketError {
  constructor(message = "Order not found") {
    super("order_not_found", message);
    this.name = "OrderNotFoundError";
  }
}

export function isMarketError(error: unknown): error is MarketError {
  return error instanceof MarketError;
}
