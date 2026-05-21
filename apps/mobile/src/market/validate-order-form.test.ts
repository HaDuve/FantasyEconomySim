import { validateOrderForm } from "./validate-order-form";

describe("validateOrderForm", () => {
  it("accepts positive integer price and quantity", () => {
    expect(validateOrderForm("3", "2")).toEqual({
      ok: true,
      price: 3,
      quantity: 2,
    });
  });

  it("rejects non-positive or non-integer price", () => {
    expect(validateOrderForm("0", "1")).toEqual({
      ok: false,
      field: "price",
      message: "Enter a whole number greater than 0.",
    });
    expect(validateOrderForm("1.5", "1").ok).toBe(false);
  });

  it("rejects non-positive or non-integer quantity", () => {
    expect(validateOrderForm("2", "-1")).toEqual({
      ok: false,
      field: "quantity",
      message: "Enter a whole number greater than 0.",
    });
  });
});
