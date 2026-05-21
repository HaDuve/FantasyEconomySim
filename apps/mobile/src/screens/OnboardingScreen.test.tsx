import { render, screen } from "@testing-library/react-native";

import { OnboardingScreen } from "./OnboardingScreen";

describe("OnboardingScreen", () => {
  it("shows connect error message when onboarding failed", () => {
    render(
      <OnboardingScreen
        busy={false}
        errorMessage="unauthorized"
        onPick={() => {}}
      />,
    );

    expect(screen.getByText("unauthorized")).toBeTruthy();
  });
});
