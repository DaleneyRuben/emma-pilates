import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import { Alert, Linking, Platform } from "react-native";

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
    expect(screen.getByTestId("glyph-faceId", { includeHiddenElements: true })).toBeOnTheScreen();
    expect(screen.getByTestId("biometric-switch-disc")).toHaveStyle({
      backgroundColor: "#FEF6F2",
      height: 36,
    });

    await act(async () => {
      await fireEvent(toggle, "valueChange", true);
    });
    expect(manager.enableBiometrics).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("switch", { name: "Entrar con Face ID" })).toHaveProp("value", true);
    expect(
      screen.getByText("Sirve cualquier cara guardada en el Face ID de este iPhone"),
    ).toBeOnTheScreen();

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

  it("warns on Android that any fingerprint on the phone works", async () => {
    jest.replaceProperty(Platform, "OS", "android");
    const screen = await renderRow(
      managerWith({ hasBiometricSession: jest.fn().mockResolvedValue(true) }),
    );

    expect(
      await screen.findByText("Sirve cualquier huella guardada en este celular"),
    ).toBeOnTheScreen();
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

    expect(
      screen.getByText("Sirve cualquier cara guardada en el Face ID de este iPhone"),
    ).toBeOnTheScreen();
  });

  // Owner, TestFlight 1.3.0: iOS refuses Face ID to an app whose permission
  // is off, and only Settings turns it back on.
  it("sends to Settings when iOS no longer lets the app use Face ID", async () => {
    const alert = jest.spyOn(Alert, "alert").mockImplementation(() => undefined);
    const openSettings = jest.spyOn(Linking, "openSettings").mockResolvedValue(undefined);
    const manager = managerWith({
      canUseBiometrics: () => false,
      isBiometricRefusedBySystem: jest.fn().mockResolvedValue(true),
    });
    const screen = await renderRow(manager);

    const toggle = await screen.findByRole("switch", { name: "Entrar con Face ID" });
    await act(async () => {
      await fireEvent(toggle, "valueChange", true);
    });

    expect(manager.enableBiometrics).not.toHaveBeenCalled();
    expect(toggle).toHaveProp("value", false);
    const [title, message, buttons] = alert.mock.calls[0]!;
    expect(title).toBe("Face ID está desactivado");
    expect(message).toBe("Para entrar con Face ID, permite que la app lo use en Ajustes.");
    const open = buttons?.find((button) => button.text === "Abrir Ajustes");
    open?.onPress?.();
    expect(openSettings).toHaveBeenCalledTimes(1);
  });

  // Review of PR #399: a Face ID locked out or no longer set up is not the
  // app's permission, so Settings for the app would not help.
  it("says Face ID is unavailable when the app's permission is not the reason", async () => {
    const alert = jest.spyOn(Alert, "alert").mockImplementation(() => undefined);
    const manager = managerWith({
      canUseBiometrics: () => false,
      wasBiometricSupportSeen: jest.fn().mockResolvedValue(true),
    });
    const screen = await renderRow(manager);

    const toggle = await screen.findByRole("switch", { name: "Entrar con Face ID" });
    await act(async () => {
      await fireEvent(toggle, "valueChange", true);
    });

    expect(manager.enableBiometrics).not.toHaveBeenCalled();
    const [title, message, buttons] = alert.mock.calls[0]!;
    expect(title).toBe("Face ID no está disponible");
    expect(message).toBe("Revisa Face ID en los ajustes del iPhone e intenta de nuevo.");
    expect(buttons?.map((button) => button.text)).toEqual(["Entendido"]);
  });
});
