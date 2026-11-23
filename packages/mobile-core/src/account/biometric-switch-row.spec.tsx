import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import { Platform } from "react-native";

import { MobileIdentityProvider } from "../auth/identity-provider";
import type { SessionManager } from "../auth/session-manager";
import { BiometricSwitchRow } from "./biometric-switch-row";

jest.mock("../monitoring/error-reporting", () => ({ reportRecoveredError: jest.fn() }));

const session = { accountId: "account-1", role: "client" as const };

function managerWith(overrides: Partial<SessionManager> = {}): SessionManager {
  return {
    canUseBiometrics: () => true,
    declineBiometricOffer: jest.fn(),
    disableBiometrics: jest.fn().mockResolvedValue(undefined),
    enableBiometrics: jest.fn().mockResolvedValue(true),
    endLocally: jest.fn(),
    getCredential: jest.fn().mockResolvedValue("credential"),
    hasBiometricSession: jest.fn().mockResolvedValue(false),
    isBiometricsEnabled: jest.fn().mockResolvedValue(false),
    logout: jest.fn(),
    refresh: jest.fn(),
    restore: jest.fn().mockResolvedValue(session),
    start: jest.fn(),
    unlockWithBiometrics: jest.fn(),
    wasBiometricOfferDeclined: jest.fn().mockResolvedValue(false),
    ...overrides,
  };
}

async function renderRow(manager: SessionManager) {
  const screen = await render(
    <MobileIdentityProvider manager={manager}>
      <BiometricSwitchRow />
    </MobileIdentityProvider>,
  );
  await waitFor(() => expect(manager.restore).toHaveBeenCalled());
  return screen;
}

// «El interruptor de B»: Perfil turns biometrics on and off on this phone.
describe("BiometricSwitchRow", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("turns Face ID on and off", async () => {
    const manager = managerWith();
    const screen = await renderRow(manager);

    const toggle = await screen.findByRole("switch", { name: "Entrar con Face ID" });
    expect(toggle).toHaveProp("value", false);
    expect(screen.getByText("Sin escribir tu contraseña")).toBeOnTheScreen();
    expect(screen.getByTestId("biometric-switch-disc")).toHaveStyle({
      backgroundColor: "#FEF6F2",
      height: 36,
    });

    await act(async () => {
      await fireEvent(toggle, "valueChange", true);
    });
    expect(manager.enableBiometrics).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("switch", { name: "Entrar con Face ID" })).toHaveProp("value", true);
    expect(screen.getByText("Activado en este celular")).toBeOnTheScreen();

    await act(async () => {
      await fireEvent(
        screen.getByRole("switch", { name: "Entrar con Face ID" }),
        "valueChange",
        false,
      );
    });
    expect(manager.disableBiometrics).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Sin escribir tu contraseña")).toBeOnTheScreen();
  });

  it("names the fingerprint on Android", async () => {
    jest.replaceProperty(Platform, "OS", "android");
    const screen = await renderRow(managerWith());

    expect(await screen.findByRole("switch", { name: "Entrar con huella" })).toBeOnTheScreen();
  });

  it("draws nothing on a phone without biometrics", async () => {
    const screen = await renderRow(managerWith({ canUseBiometrics: () => false }));

    expect(screen.queryByRole("switch")).toBeNull();
  });

  it("keeps the switch on when turning it off fails", async () => {
    const manager = managerWith({
      disableBiometrics: jest.fn().mockRejectedValue(new Error("keychain")),
      hasBiometricSession: jest.fn().mockResolvedValue(true),
    });
    const screen = await renderRow(manager);
    const toggle = await screen.findByRole("switch", { name: "Entrar con Face ID" });

    await act(async () => {
      await fireEvent(toggle, "valueChange", false);
    });

    expect(screen.getByText("Activado en este celular")).toBeOnTheScreen();
  });
});
