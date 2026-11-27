import { act, render, waitFor } from "@testing-library/react-native";
import { AppState, type AppStateStatus } from "react-native";

import { MobileIdentityProvider, useMobileIdentity } from "./identity-provider";
import type { SessionManager } from "./session-manager";
import { Text } from "../ui/text";

const session = { accountId: "account-1", role: "client" as const };

function managerWith(overrides: Partial<Record<keyof SessionManager, unknown>> = {}) {
  return {
    canUseBiometrics: jest.fn(() => false),
    declineBiometricOffer: jest.fn().mockResolvedValue(undefined),
    disableBiometrics: jest.fn().mockResolvedValue(undefined),
    enableBiometrics: jest.fn().mockResolvedValue(true),
    endLocally: jest.fn(),
    getCredential: jest.fn().mockResolvedValue(null),
    hasBiometricSession: jest.fn().mockResolvedValue(false),
    isBiometricsEnabled: jest.fn().mockResolvedValue(false),
    logout: jest.fn(),
    refresh: jest.fn().mockResolvedValue(null),
    rememberBiometricSupport: jest.fn().mockResolvedValue(undefined),
    restore: jest.fn().mockResolvedValue(session),
    start: jest.fn().mockResolvedValue(session),
    unlockWithBiometrics: jest.fn(),
    wasBiometricOfferDeclined: jest.fn().mockResolvedValue(false),
    wasBiometricSupportSeen: jest.fn().mockResolvedValue(false),
    isBiometricRefusedBySystem: jest.fn().mockResolvedValue(false),
    ...overrides,
  } as SessionManager;
}

function Probe() {
  const { biometrics } = useMobileIdentity();
  return (
    <Text variant="cuerpo">
      {[
        biometrics.available ? "available" : "unavailable",
        biometrics.blockedBySystem ? "blocked" : "usable",
        biometrics.permissionRefused ? "refused" : "allowed",
      ].join(" ")}
    </Text>
  );
}

async function renderWith(manager: SessionManager) {
  return render(
    <MobileIdentityProvider manager={manager}>
      <Probe />
    </MobileIdentityProvider>,
  );
}

// Owner, TestFlight 1.3.0: a new Client who did not turn Face ID on at the
// offer found no «Entrar con Face ID» in Perfil, so she could never turn it on.
describe("MobileIdentityProvider biometric availability", () => {
  let appStateListener: ((state: AppStateStatus) => void) | undefined;

  beforeEach(() => {
    appStateListener = undefined;
    jest.spyOn(AppState, "addEventListener").mockImplementation((_type, listener) => {
      appStateListener = listener as (state: AppStateStatus) => void;
      return { remove: jest.fn() };
    });
  });

  afterEach(() => jest.restoreAllMocks());

  it("keeps the switch on a phone that supported biometrics when iOS now refuses them to the app", async () => {
    const screen = await renderWith(
      managerWith({ wasBiometricSupportSeen: jest.fn().mockResolvedValue(true) }),
    );

    await waitFor(() => expect(screen.getByText("available blocked allowed")).toBeOnTheScreen());
  });

  it("shows no switch on a phone that never could use biometrics", async () => {
    const screen = await renderWith(managerWith());

    await act(async () => undefined);
    expect(screen.getByText("unavailable usable allowed")).toBeOnTheScreen();
  });

  it("remembers that this phone supports biometrics once it can use them", async () => {
    const manager = managerWith({ canUseBiometrics: jest.fn(() => true) });
    const screen = await renderWith(manager);

    await waitFor(() => expect(manager.rememberBiometricSupport).toHaveBeenCalled());
    expect(screen.getByText("available usable allowed")).toBeOnTheScreen();
  });

  it("reads the phone's biometrics again when the app comes back from Settings", async () => {
    let usable = false;
    const manager = managerWith({ canUseBiometrics: jest.fn(() => usable) });
    const screen = await renderWith(manager);
    await act(async () => undefined);
    expect(screen.getByText("unavailable usable allowed")).toBeOnTheScreen();

    usable = true;
    await act(async () => appStateListener?.("active"));

    expect(screen.getByText("available usable allowed")).toBeOnTheScreen();
  });

  // Coordinator, 2026-11-27: her iPhone's Settings show Face ID off for Emma
  // Pilates; nothing on the phone had recorded that it supported Face ID.
  it("keeps the switch on an iPhone whose Face ID permission the app was refused", async () => {
    const screen = await renderWith(
      managerWith({ isBiometricRefusedBySystem: jest.fn().mockResolvedValue(true) }),
    );

    await waitFor(() => expect(screen.getByText("available blocked refused")).toBeOnTheScreen());
  });
});
