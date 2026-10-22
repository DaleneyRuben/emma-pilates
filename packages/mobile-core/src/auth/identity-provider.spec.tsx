import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import { Button, Text } from "react-native";

import { reportRecoveredError } from "../monitoring/error-reporting";
import { MobileIdentityProvider, useMobileIdentity } from "./identity-provider";

jest.mock("../monitoring/error-reporting", () => ({ reportRecoveredError: jest.fn() }));

// MOB-069: a keychain that cannot be read (an unsigned Simulator build
// answered -34018) must not hold the identity, and the launch screen, forever.
const failingManager = (failure: "hasBiometricSession" | "restore", error: Error) => ({
  endLocally: jest.fn(),
  refresh: jest.fn().mockResolvedValue(null),
  hasBiometricSession:
    failure === "hasBiometricSession"
      ? jest.fn().mockRejectedValue(error)
      : jest.fn().mockResolvedValue(false),
  logout: jest.fn(),
  restore:
    failure === "restore"
      ? jest.fn().mockRejectedValue(error)
      : jest.fn().mockResolvedValue({ accountId: "account-1", role: "client" }),
  start: jest.fn(),
  unlockWithBiometrics: jest.fn(),
});

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
  const acting = identity.session?.impersonation?.staffMemberName ?? "nobody";

  return (
    <>
      <Text>{identity.status}</Text>
      <Button onPress={() => void identity.refresh()} title="Refresh" />
      <Text>{`acting:${acting}`}</Text>
      <Button onPress={() => identity.start("new-credential")} title="Start" />
      <Button onPress={() => identity.logout()} title="Logout" />
      <Button onPress={() => identity.unlockWithBiometrics()} title="Unlock" />
    </>
  );
}

describe("MobileIdentityProvider", () => {
  afterEach(() => {
    jest.mocked(reportRecoveredError).mockClear();
  });

  it("restores the current mobile Authentication Session at startup", async () => {
    let finishRestoration: (session: { accountId: string; role: "trainer" }) => void = () =>
      undefined;
    const manager = {
      endLocally: jest.fn(),
      refresh: jest.fn().mockResolvedValue(null),
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
      refresh: jest.fn().mockResolvedValue(null),
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

  it("refreshes the session in place when an Impersonation starts or ends (FUT-001)", async () => {
    const impersonation = {
      id: "impersonation-1",
      staffMemberId: "staff-2",
      staffMemberName: "Camila Rojas",
      role: "trainer" as const,
      expiresAt: "2026-10-22T15:30:00.000Z",
    };
    const manager = {
      endLocally: jest.fn(),
      hasBiometricSession: jest.fn().mockResolvedValue(false),
      logout: jest.fn(),
      refresh: jest
        .fn()
        .mockResolvedValueOnce({ accountId: "trainer-account", role: "trainer", impersonation })
        .mockResolvedValueOnce({ accountId: "account-1", role: "administrator" }),
      restore: jest.fn().mockResolvedValue({ accountId: "account-1", role: "administrator" }),
      start: jest.fn(),
      unlockWithBiometrics: jest.fn(),
    };
    const screen = await render(
      <MobileIdentityProvider manager={manager}>
        <IdentityActionsProbe />
      </MobileIdentityProvider>,
    );
    await waitFor(() => {
      expect(screen.getByText("signed-in")).toBeOnTheScreen();
    });

    await act(async () => {
      fireEvent.press(screen.getByRole("button", { name: "Refresh" }));
    });
    await waitFor(() => {
      expect(screen.getByText("acting:Camila Rojas")).toBeOnTheScreen();
    });

    await act(async () => {
      fireEvent.press(screen.getByRole("button", { name: "Refresh" }));
    });
    await waitFor(() => {
      expect(screen.getByText("acting:nobody")).toBeOnTheScreen();
    });
    expect(screen.getByText("signed-in")).toBeOnTheScreen();
  });

  it("waits for an explicit biometric unlock before restoring the session", async () => {
    const session = { accountId: "account-3", role: "client" as const };
    const manager = {
      endLocally: jest.fn(),
      refresh: jest.fn().mockResolvedValue(null),
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
      refresh: jest.fn().mockResolvedValue(null),
      hasBiometricSession: jest.fn().mockResolvedValue(false),
      logout: jest.fn(),
      restore: jest.fn().mockResolvedValue({ accountId: "account-1", role: "client" }),
      start: jest.fn().mockResolvedValue({ accountId: "account-2", role: "client" }),
      unlockWithBiometrics: jest.fn(),
    };

    function ClosureProbe() {
      const identity = useMobileIdentity();

      return (
        <>
          <Text>{`${identity.status}|${identity.signOutNotice ?? "none"}`}</Text>
          <Button onPress={() => identity.endClosedSession("Cerramos tu cuenta.")} title="Close" />
          <Button onPress={() => identity.start("new-credential")} title="Start" />
        </>
      );
    }

    const screen = await render(
      <MobileIdentityProvider manager={manager}>
        <ClosureProbe />
      </MobileIdentityProvider>,
    );
    await waitFor(() => expect(screen.getByText("signed-in|none")).toBeOnTheScreen());

    await act(async () => {
      fireEvent.press(screen.getByText("Close"));
    });

    await waitFor(() =>
      expect(screen.getByText("signed-out|Cerramos tu cuenta.")).toBeOnTheScreen(),
    );
    expect(manager.endLocally).toHaveBeenCalledWith({
      accountId: "account-1",
      role: "client",
    });
    expect(manager.logout).not.toHaveBeenCalled();

    await act(async () => {
      fireEvent.press(screen.getByText("Start"));
    });

    await waitFor(() => expect(screen.getByText("signed-in|none")).toBeOnTheScreen());
  });

  it("signs out and reports once when the credential restore rejects (MOB-069)", async () => {
    const error = new Error("keychain -34018");
    const manager = failingManager("restore", error);
    const screen = await render(
      <MobileIdentityProvider manager={manager}>
        <IdentityProbe />
      </MobileIdentityProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText("signed-out")).toBeOnTheScreen();
    });
    expect(reportRecoveredError).toHaveBeenCalledTimes(1);
    expect(reportRecoveredError).toHaveBeenCalledWith(error);
  });

  it("signs out and reports once when the biometric check rejects (MOB-069)", async () => {
    const error = new Error("biometrics unavailable");
    const manager = failingManager("hasBiometricSession", error);
    const screen = await render(
      <MobileIdentityProvider manager={manager}>
        <IdentityProbe />
      </MobileIdentityProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText("signed-out")).toBeOnTheScreen();
    });
    expect(reportRecoveredError).toHaveBeenCalledTimes(1);
    expect(reportRecoveredError).toHaveBeenCalledWith(error);
  });

  it("leaves the identity alone when the restore rejects after unmounting (MOB-069)", async () => {
    let failRestoration: (error: Error) => void = () => undefined;
    const manager = {
      endLocally: jest.fn(),
      refresh: jest.fn().mockResolvedValue(null),
      hasBiometricSession: jest.fn().mockResolvedValue(false),
      logout: jest.fn(),
      restore: jest.fn().mockReturnValue(
        new Promise((_resolve, reject) => {
          failRestoration = reject;
        }),
      ),
      start: jest.fn(),
      unlockWithBiometrics: jest.fn(),
    };
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => undefined);
    const screen = await render(
      <MobileIdentityProvider manager={manager}>
        <IdentityProbe />
      </MobileIdentityProvider>,
    );

    expect(screen.getByText("restoring")).toBeOnTheScreen();
    await screen.unmount();
    await act(async () => {
      failRestoration(new Error("keychain -34018"));
    });

    expect(consoleError).not.toHaveBeenCalled();
    expect(reportRecoveredError).toHaveBeenCalledTimes(1);
    consoleError.mockRestore();
  });
});
