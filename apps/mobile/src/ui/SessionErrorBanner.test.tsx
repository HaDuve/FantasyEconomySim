import { render, screen } from "@testing-library/react-native";

import { SessionErrorBanner } from "./SessionErrorBanner";

describe("SessionErrorBanner", () => {
  it("renders nothing when there is no error", () => {
    render(<SessionErrorBanner errorMessage={null} />);
    expect(screen.queryByText(/sync/i)).toBeNull();
  });

  it("shows the session error message when present", () => {
    render(<SessionErrorBanner errorMessage="sync_not_connected" />);
    expect(screen.getByText("sync_not_connected")).toBeTruthy();
  });
});
