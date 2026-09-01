import { act, render, waitFor } from "@testing-library/react-native";
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
    let finishRestoration: (
      session: { accountId: string; role: "trainer" },
    ) => void = () => undefined;
    const manager = {
      logout: jest.fn(),
      restore: jest.fn().mockReturnValue(
        new Promise((resolve) => {
          finishRestoration = resolve;
        }),
      ),
      start: jest.fn(),
    };
    const screen = await render(
      <MobileIdentityProvider manager={manager}>
        <IdentityProbe />
      </MobileIdentityProvider>,
    );

    expect(screen.getByText("restoring")).toBeOnTheScreen();
    await act(() => {
      finishRestoration({ accountId: "account-1", role: "trainer" });
    });
    await waitFor(() => {
      expect(screen.getByText("signed-in:trainer")).toBeOnTheScreen();
    });
  });
});
