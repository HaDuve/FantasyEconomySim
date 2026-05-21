import { fireEvent, render, screen } from "@testing-library/react-native";

import { initialHudState } from "../session/hud-state";
import { MarketListScreen } from "./MarketListScreen";

describe("MarketListScreen", () => {
  it("lists all eight tradeable resources and excludes crown", () => {
    const onOpenResource = jest.fn();

    render(
      <MarketListScreen hud={initialHudState()} onOpenResource={onOpenResource} />,
    );

    expect(screen.getByText("grain")).toBeTruthy();
    expect(screen.getByText("scrolls")).toBeTruthy();
    expect(screen.queryByText("crown")).toBeNull();
    expect(screen.getAllByRole("button")).toHaveLength(8);
  });

  it("opens a resource book when a resource is chosen", () => {
    const onOpenResource = jest.fn();

    render(
      <MarketListScreen hud={initialHudState()} onOpenResource={onOpenResource} />,
    );

    fireEvent.press(screen.getByText("grain"));
    expect(onOpenResource).toHaveBeenCalledWith("grain");
  });
});
