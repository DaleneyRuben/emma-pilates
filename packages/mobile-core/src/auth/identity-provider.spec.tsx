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
      <Button
        onPress={() => identity.unlockWithBiometrics()}
        title="Unlock"
      />
    </>
  );
}

describe("MobileIdentityProvider", () => {
  it("restores the current mobile Authentication Session at startup", async () => {
    let finishRestoration: (
      session: { accountId: string; role: "trainer" },
    ) => void = () => undefined;
    const manager = {
      endLocally: jest.fn(),
      hasBiometricSession: jest.fn().mockResolvedValue(false),
      logout: jest.fn(),
      restore: jest.fn().mockReturnValue(
        new Promise((resolve) => {
          finishRestoration = resolve;
        }),
      ),
      start: jest.fn(),
      unlockWithBiometrics: jest.fn(),
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
      endLocally: jest.fn(),
      hasBiometricSession: jest.fn().mockResolvedValue(false),
      logout: jest.fn().mockResolvedValue(undefined),
      restore: jest.fn().mockResolvedValue(null),
      start: jest.fn().mockResolvedValue(session),
      unlockWithBiometrics: jest.fn(),
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

  it("waits for an explicit biometric unlock before restoring the session", async () => {
    const session = { accountId: "account-3", role: "client" as const };
    const manager = {
      endLocally: jest.fn(),
      hasBiometricSession: jest.fn().mockResolvedValue(true),
      logout: jest.fn(),
      restore: jest.fn().mockResolvedValue(null),
      start: jest.fn(),
      unlockWithBiometrics: jest.fn().mockResolvedValue(session),
    };
    const screen = await render(
      <MobileIdentityProvider manager={manager}>
        <IdentityActionsProbe />
      </MobileIdentityProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText("biometric-locked")).toBeOnTheScreen();
    });
    expect(manager.unlockWithBiometrics).not.toHaveBeenCalled();

    await act(async () => {
      fireEvent.press(screen.getByRole("button", { name: "Unlock" }));
    });
    await waitFor(() => {
      expect(screen.getByText("signed-in")).toBeOnTheScreen();
    });
    expect(manager.unlockWithBiometrics).toHaveBeenCalledTimes(1);
  });

  it("signs out a closed Account locally and keeps a notice for the login screen", async () => {
    const manager = {
      endLocally: jest.fn().mockResolvedValue(undefined),
      hasBiometricSession: jest.fn().mockResolvedValue(false),
      logout: jest.fn(),
      restore: jest
        .fn()
        .mockResolvedValue({ accountId: "account-1", role: "client" }),
      start: jest
        .fn()
        .mockResolvedValue({ accountId: "account-2", role: "client" }),
      unlockWithBiometrics: jest.fn(),
    };

    function ClosureProbe() {
      const identity = useMobileIdentity();

      return (
        <>
          <Text>{`${identity.status}|${identity.signOutNotice ?? "none"}`}</Text>
          <Button
            onPress={() => identity.endClosedSession("Cerramos tu cuenta.")}
            title="Close"
          />
          <Button
            onPress={() => identity.start("new-credential")}
            title="Start"
          />
        </>
      );
    }

    const screen = await render(
      <MobileIdentityProvider manager={manager}>
        <ClosureProbe />
      </MobileIdentityProvider>,
    );
    await waitFor(() =>
      expect(screen.getByText("signed-in|none")).toBeOnTheScreen(),
    );

    await act(async () => {
      fireEvent.press(screen.getByText("Close"));
    });

    await waitFor(() =>
      expect(
        screen.getByText("signed-out|Cerramos tu cuenta."),
      ).toBeOnTheScreen(),
    );
    expect(manager.endLocally).toHaveBeenCalledWith({
      accountId: "account-1",
      role: "client",
    });
    expect(manager.logout).not.toHaveBeenCalled();

    await act(async () => {
      fireEvent.press(screen.getByText("Start"));
    });

    await waitFor(() =>
      expect(screen.getByText("signed-in|none")).toBeOnTheScreen(),
    );
  });
});
