import { render, screen } from "@testing-library/react-native";

import { initialHudState } from "../session/hud-state";
import { HudScreen } from "./HudScreen";

describe("HudScreen", () => {
  it("shows wallet, inventory, worker, tick, and connection status", () => {
    render(
      <HudScreen
        hud={{
          ...initialHudState(),
          connectionStatus: "connected",
          tickId: 12,
          walletCrowns: 100,
          inventory: { grain: 3 },
          workers: [{ id: "w1", profession: "hunter" }],
        }}
      />,
    );

    expect(screen.getByText("Connection: connected")).toBeTruthy();
    expect(screen.getByText("Tick: 12")).toBeTruthy();
    expect(screen.getByText("Wallet: 100 crowns")).toBeTruthy();
    expect(screen.getByText("Inventory: grain: 3")).toBeTruthy();
    expect(screen.getByText("Worker: hunter")).toBeTruthy();
  });
});
