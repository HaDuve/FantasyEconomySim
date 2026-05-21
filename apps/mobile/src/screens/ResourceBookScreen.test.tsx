import { fireEvent, render, screen } from "@testing-library/react-native";

import { initialHudState } from "../session/hud-state";
import { ResourceBookScreen } from "./ResourceBookScreen";

describe("ResourceBookScreen", () => {
  const hud = {
    ...initialHudState(),
    tickId: 5,
    books: [
      {
        resourceId: "grain" as const,
        bids: [{ orderId: "b1", price: 4, quantity: 2 }],
        asks: [{ orderId: "a1", price: 6, quantity: 1 }],
      },
    ],
    orders: [
      {
        id: "o1",
        resourceId: "grain" as const,
        side: "buy" as const,
        price: 4,
        quantity: 2,
      },
    ],
  };

  it("shows bid and ask levels for the selected resource", () => {
    render(
      <ResourceBookScreen
        resourceId="grain"
        hud={hud}
        onBack={jest.fn()}
        onPlaceOrder={jest.fn()}
        onCancelOrder={jest.fn()}
      />,
    );

    expect(screen.getByText(/grain market/i)).toBeTruthy();
    expect(screen.getByText(/bid 4 × 2/i)).toBeTruthy();
    expect(screen.getByText(/ask 6 × 1/i)).toBeTruthy();
    expect(screen.getByText(/GTC/i)).toBeTruthy();
    expect(screen.getByText(/next global tick/i)).toBeTruthy();
  });

  it("lists open GTC orders for this resource and can cancel them", () => {
    const onCancelOrder = jest.fn();

    render(
      <ResourceBookScreen
        resourceId="grain"
        hud={hud}
        onBack={jest.fn()}
        onPlaceOrder={jest.fn()}
        onCancelOrder={onCancelOrder}
      />,
    );

    expect(screen.getByText(/your open orders/i)).toBeTruthy();
    expect(screen.getByText(/buy 4 × 2/i)).toBeTruthy();

    fireEvent.press(screen.getByText("Cancel"));
    expect(onCancelOrder).toHaveBeenCalledWith("o1");
  });

  it("submits a limit order via the place form", () => {
    const onPlaceOrder = jest.fn();

    render(
      <ResourceBookScreen
        resourceId="grain"
        hud={hud}
        onBack={jest.fn()}
        onPlaceOrder={onPlaceOrder}
        onCancelOrder={jest.fn()}
      />,
    );

    fireEvent.changeText(screen.getByLabelText("Price"), "3");
    fireEvent.changeText(screen.getByLabelText("Quantity"), "1");
    fireEvent.press(screen.getByText("Place buy"));

    expect(onPlaceOrder).toHaveBeenCalledWith({
      resourceId: "grain",
      side: "buy",
      price: 3,
      quantity: 1,
    });
  });
});
