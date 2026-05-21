import { render, screen } from "@testing-library/react-native";
import { Text } from "react-native";

import { AppSafeArea } from "./AppSafeArea";

describe("AppSafeArea", () => {
  it("wraps children in a full-screen safe area container", () => {
    render(
      <AppSafeArea>
        <Text>Inside safe area</Text>
      </AppSafeArea>,
    );

    expect(screen.getByTestId("app-safe-area")).toBeTruthy();
    expect(screen.getByText("Inside safe area")).toBeTruthy();
  });
});
