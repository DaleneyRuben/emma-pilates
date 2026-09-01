import {
  act,
  fireEvent,
  render,
  waitFor,
} from "@testing-library/react-native";
import { Button, Text } from "react-native";

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

function IdentityActionsProbe() {
  const identity = useMobileIdentity();

  return (
    <>
      <Text>{identity.status}</Text>
      <Button
        onPress={() => identity.start("new-credential")}
        title="Start"
      />
      <Button onPress={() => identity.logout()} title="Logout" />
    </>
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

  it("starts a newly authenticated session and logs it out", async () => {
    const session = { accountId: "account-2", role: "assistant" as const };
    const manager = {
      logout: jest.fn().mockResolvedValue(undefined),
      restore: jest.fn().mockResolvedValue(null),
      start: jest.fn().mockResolvedValue(session),
    };
    const screen = await render(
      <MobileIdentityProvider manager={manager}>
        <IdentityActionsProbe />
      </MobileIdentityProvider>,
    );
    await waitFor(() => {
      expect(screen.getByText("signed-out")).toBeOnTheScreen();
    });

    await act(async () => {
      fireEvent.press(screen.getByRole("button", { name: "Start" }));
    });
    await waitFor(() => {
      expect(screen.getByText("signed-in")).toBeOnTheScreen();
    });
    expect(manager.start).toHaveBeenCalledWith("new-credential");

    await act(async () => {
      fireEvent.press(screen.getByRole("button", { name: "Logout" }));
    });
    await waitFor(() => {
      expect(screen.getByText("signed-out")).toBeOnTheScreen();
    });
    expect(manager.logout).toHaveBeenCalledWith(session);
  });
});
