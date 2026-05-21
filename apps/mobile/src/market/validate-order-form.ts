export type OrderFormValidation =
  | { ok: true; price: number; quantity: number }
  | { ok: false; field: "price" | "quantity"; message: string };

const POSITIVE_INTEGER = /^[1-9]\d*$/;

function parsePositiveInteger(text: string): number | null {
  if (!POSITIVE_INTEGER.test(text.trim())) {
    return null;
  }
  return Number.parseInt(text, 10);
}

export function validateOrderForm(
  priceText: string,
  quantityText: string,
): OrderFormValidation {
  const price = parsePositiveInteger(priceText);
  if (price === null) {
    return { ok: false, field: "price", message: "Enter a whole number greater than 0." };
  }

  const quantity = parsePositiveInteger(quantityText);
  if (quantity === null) {
    return { ok: false, field: "quantity", message: "Enter a whole number greater than 0." };
  }

  return { ok: true, price, quantity };
}
