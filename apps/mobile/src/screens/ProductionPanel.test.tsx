import { render, screen, fireEvent } from "@testing-library/react-native";

import { initialHudState } from "../session/hud-state";
import { ProductionPanel } from "./ProductionPanel";

describe("ProductionPanel", () => {
  it("lets a hunter buy grain from the pool and start field work", () => {
    const onPoolBuy = jest.fn();
    const onSetAssignment = jest.fn();

    render(
      <ProductionPanel
        hud={{
          ...initialHudState(),
          walletCrowns: 100,
          workers: [{ id: "w1", profession: "hunter" }],
        }}
        onPoolBuy={onPoolBuy}
        onPurchasePrivateBuilding={jest.fn()}
        onSetAssignment={onSetAssignment}
      />,
    );

    fireEvent.press(screen.getByLabelText("Pool buy grain"));
    expect(onPoolBuy).toHaveBeenCalledWith({ resourceId: "grain", quantity: 1 });

    fireEvent.press(screen.getByLabelText("Set assignment"));
    expect(onSetAssignment).toHaveBeenCalledWith({
      workerId: "w1",
      assignmentId: "hunt_game",
    });
  });

  it("shows buy mine for a miner with enough crowns", () => {
    const onPurchase = jest.fn();

    render(
      <ProductionPanel
        hud={{
          ...initialHudState(),
          walletCrowns: 100,
          workers: [{ id: "w1", profession: "miner" }],
        }}
        onPoolBuy={jest.fn()}
        onPurchasePrivateBuilding={onPurchase}
        onSetAssignment={jest.fn()}
      />,
    );

    fireEvent.press(screen.getByLabelText("Buy mine"));
    expect(onPurchase).toHaveBeenCalledWith("mine");
  });
});
