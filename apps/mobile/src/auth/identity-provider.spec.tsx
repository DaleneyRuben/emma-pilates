import { render, waitFor } from "@testing-library/react-native";
import { Text } from "react-native";

import {
  MobileIdentityProvider,
  useMobileIdentity,
} from "./identity-provider";

function IdentityProbe() {
  const identity = useMobileIdentity();

  return (
    <Text>
      {identity.status}
      {identity.session === null ? "" : `:${identity.session.role}`}
    </Text>
  );
}

describe("MobileIdentityProvider", () => {
  it("restores the current mobile Authentication Session at startup", async () => {
    const manager = {
      logout: jest.fn(),
      restore: jest.fn().mockResolvedValue({
        accountId: "account-1",
        role: "trainer",
      }),
      start: jest.fn(),
    };
    const screen = render(
      <MobileIdentityProvider manager={manager}>
        <IdentityProbe />
      </MobileIdentityProvider>,
    );

    expect(screen.getByText("restoring")).toBeOnTheScreen();
    await waitFor(() => {
      expect(screen.getByText("signed-in:trainer")).toBeOnTheScreen();
    });
  });
});
