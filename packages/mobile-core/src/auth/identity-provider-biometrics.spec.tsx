import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import { Pressable } from "react-native";

import { MobileIdentityProvider, useMobileIdentity } from "./identity-provider";
import type { SessionManager } from "./session-manager";
import { Text } from "../ui/text";

const session = { accountId: "account-1", role: "client" as const };

function managerWith(overrides: Partial<Record<keyof SessionManager, unknown>> = {}) {
  return {
    canUseBiometrics: jest.fn(() => true),
    declineBiometricOffer: jest.fn().mockResolvedValue(undefined),
    disableBiometrics: jest.fn().mockResolvedValue(undefined),
    enableBiometrics: jest.fn().mockResolvedValue(true),
    endLocally: jest.fn(),
    getCredential: jest.fn().mockResolvedValue(null),
    hasBiometricSession: jest.fn().mockResolvedValue(false),
    isBiometricsEnabled: jest.fn().mockResolvedValue(false),
    logout: jest.fn(),
    refresh: jest.fn().mockResolvedValue(null),
    restore: jest.fn().mockResolvedValue(null),
    start: jest.fn().mockResolvedValue(session),
    unlockWithBiometrics: jest.fn().mockResolvedValue({ session, status: "signed-in" }),
    wasBiometricOfferDeclined: jest.fn().mockResolvedValue(false),
    ...overrides,
  } as SessionManager;
}

function Action({ onPress, title }: { onPress: () => unknown; title: string }) {
  return (
    <Pressable accessibilityLabel={title} accessibilityRole="button" onPress={() => onPress()}>
      <Text variant="boton">{title}</Text>
    </Pressable>
  );
}

function Probe() {
  const identity = useMobileIdentity();
  const { biometrics } = identity;
  const flags = [
    identity.status,
    biometrics.available ? "available" : "unavailable",
    biometrics.enabled ? "enabled" : "disabled",
    biometrics.offer ? "offer" : "no-offer",
    biometrics.enabledNotice ? "notice" : "no-notice",
  ];
  const lock = [
    biometrics.autoPrompt ? "auto-prompt" : "no-auto-prompt",
    biometrics.unlockError ?? "no-error",
  ];

  return (
    <>
      <Text variant="cuerpo">{flags.join(" ")}</Text>
      <Text variant="cuerpo">{lock.join(" | ")}</Text>
      <Action
        onPress={() => identity.start("password", { offerBiometrics: true })}
        title="Password"
      />
      <Action onPress={() => identity.start("recovery")} title="Recovery" />
      <Action onPress={() => identity.unlockWithBiometrics()} title="Unlock" />
      <Action onPress={() => identity.logout()} title="Logout" />
      <Action onPress={() => biometrics.enable()} title="Enable" />
      <Action onPress={() => biometrics.disable()} title="Disable" />
      <Action onPress={() => biometrics.useAnotherAccount()} title="Another account" />
      <Action onPress={() => biometrics.dismissOffer()} title="Dismiss" />
      <Action onPress={() => biometrics.dismissEnabledNotice()} title="Close notice" />
    </>
  );
}

async function renderWith(manager: SessionManager) {
  const screen = await render(
    <MobileIdentityProvider manager={manager}>
      <Probe />
    </MobileIdentityProvider>,
  );
  await waitFor(() => expect(screen.queryByText(/^restoring/)).toBeNull());
  return screen;
}

async function press(screen: Awaited<ReturnType<typeof renderWith>>, name: string) {
  await act(async () => {
    await fireEvent.press(screen.getByRole("button", { name }));
  });
}

describe("MobileIdentityProvider biometrics", () => {
  it("offers biometrics right after a password sign-in", async () => {
    const screen = await renderWith(managerWith());

    expect(screen.getByText("signed-out available disabled no-offer no-notice")).toBeOnTheScreen();
    await press(screen, "Password");

    expect(screen.getByText("signed-in available disabled offer no-notice")).toBeOnTheScreen();
  });

  it.each([
    ["the device cannot use biometrics", { canUseBiometrics: jest.fn(() => false) }],
    [
      "the offer was declined before",
      { wasBiometricOfferDeclined: jest.fn().mockResolvedValue(true) },
    ],
    ["biometrics are already on", { isBiometricsEnabled: jest.fn().mockResolvedValue(true) }],
  ])("offers nothing when %s", async (_case, overrides) => {
    const screen = await renderWith(managerWith(overrides));

    await press(screen, "Password");

    expect(screen.getByText(/^signed-in .* no-offer/)).toBeOnTheScreen();
  });

  it("offers nothing after a recovery link signs in", async () => {
    const screen = await renderWith(managerWith());

    await press(screen, "Recovery");

    expect(screen.getByText(/^signed-in .* no-offer/)).toBeOnTheScreen();
  });

  it("enables biometrics from the offer and says so once", async () => {
    const manager = managerWith();
    const screen = await renderWith(manager);
    await press(screen, "Password");

    await press(screen, "Enable");

    expect(manager.enableBiometrics).toHaveBeenCalledTimes(1);
    expect(screen.getByText("signed-in available enabled no-offer notice")).toBeOnTheScreen();
    await press(screen, "Close notice");
    expect(screen.getByText("signed-in available enabled no-offer no-notice")).toBeOnTheScreen();
  });

  it("closes the offer quietly when the prompt is cancelled", async () => {
    const manager = managerWith({ enableBiometrics: jest.fn().mockResolvedValue(false) });
    const screen = await renderWith(manager);
    await press(screen, "Password");

    await press(screen, "Enable");

    expect(screen.getByText("signed-in available disabled no-offer no-notice")).toBeOnTheScreen();
    expect(manager.declineBiometricOffer).not.toHaveBeenCalled();
  });

  it("remembers «Ahora no» and closes the offer", async () => {
    const manager = managerWith();
    const screen = await renderWith(manager);
    await press(screen, "Password");

    await press(screen, "Dismiss");

    expect(manager.declineBiometricOffer).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/no-offer/)).toBeOnTheScreen();
  });

  it("starts locked with biometrics on, unlocks, and turns them off", async () => {
    const manager = managerWith({ hasBiometricSession: jest.fn().mockResolvedValue(true) });
    const screen = await renderWith(manager);
    expect(
      screen.getByText("biometric-locked available enabled no-offer no-notice"),
    ).toBeOnTheScreen();

    await press(screen, "Unlock");
    expect(screen.getByText("signed-in available enabled no-offer no-notice")).toBeOnTheScreen();

    await press(screen, "Disable");
    expect(manager.disableBiometrics).toHaveBeenCalledTimes(1);
    expect(screen.getByText("signed-in available disabled no-offer no-notice")).toBeOnTheScreen();
  });

  // Owner, 2026-11-23: the prompt opens by itself once per launch.
  it("asks for the prompt by itself only until the first unlock of the launch", async () => {
    const manager = managerWith({
      hasBiometricSession: jest.fn().mockResolvedValue(true),
      unlockWithBiometrics: jest.fn().mockResolvedValue({ status: "cancelled" }),
    });
    const screen = await renderWith(manager);
    expect(screen.getByText("auto-prompt | no-error")).toBeOnTheScreen();

    await press(screen, "Unlock");

    expect(screen.getByText(/^biometric-locked available enabled/)).toBeOnTheScreen();
    expect(screen.getByText("no-auto-prompt | no-error")).toBeOnTheScreen();
    expect(manager.logout).not.toHaveBeenCalled();
  });

  it("says to try again when the scan worked but the server could not be reached", async () => {
    const manager = managerWith({
      hasBiometricSession: jest.fn().mockResolvedValue(true),
      unlockWithBiometrics: jest.fn().mockResolvedValue({ status: "failed" }),
    });
    const screen = await renderWith(manager);

    await press(screen, "Unlock");

    expect(screen.getByText(/^biometric-locked/)).toBeOnTheScreen();
    expect(
      screen.getByText(
        "no-auto-prompt | No pudimos entrar. Revisa tu conexión e intenta de nuevo.",
      ),
    ).toBeOnTheScreen();
  });

  it("falls back to the password when the key no longer works", async () => {
    const manager = managerWith({
      hasBiometricSession: jest.fn().mockResolvedValue(true),
      unlockWithBiometrics: jest.fn().mockResolvedValue({ status: "invalid" }),
    });
    const screen = await renderWith(manager);

    await press(screen, "Unlock");

    expect(screen.getByText("signed-out available disabled no-offer no-notice")).toBeOnTheScreen();
  });

  it("offers biometrics again to a phone from before the key that could not keep one", async () => {
    const manager = managerWith({
      hasBiometricSession: jest.fn().mockResolvedValue(true),
      unlockWithBiometrics: jest
        .fn()
        .mockResolvedValue({ keyLost: true, session, status: "signed-in" }),
    });
    const screen = await renderWith(manager);

    await press(screen, "Unlock");

    expect(screen.getByText("signed-in available disabled offer no-notice")).toBeOnTheScreen();
  });

  it("keeps biometrics on after signing out, without asking by itself", async () => {
    const manager = managerWith({ hasBiometricSession: jest.fn().mockResolvedValue(true) });
    const screen = await renderWith(manager);
    await press(screen, "Unlock");

    await press(screen, "Logout");

    expect(
      screen.getByText("biometric-locked available enabled no-offer no-notice"),
    ).toBeOnTheScreen();
    expect(screen.getByText("no-auto-prompt | no-error")).toBeOnTheScreen();
  });

  it("signs out fully when biometrics were off", async () => {
    const screen = await renderWith(managerWith());
    await press(screen, "Password");

    await press(screen, "Logout");

    expect(screen.getByText(/^signed-out available disabled/)).toBeOnTheScreen();
  });

  it("forgets biometrics for «Usar otra cuenta» and shows the password form", async () => {
    const manager = managerWith({ hasBiometricSession: jest.fn().mockResolvedValue(true) });
    const screen = await renderWith(manager);

    await press(screen, "Another account");

    expect(manager.disableBiometrics).toHaveBeenCalledTimes(1);
    expect(screen.getByText("signed-out available disabled no-offer no-notice")).toBeOnTheScreen();
  });

  it("signs in without an offer when the offer check cannot read the keychain", async () => {
    const screen = await renderWith(
      managerWith({ wasBiometricOfferDeclined: jest.fn().mockRejectedValue(new Error("-34018")) }),
    );

    await press(screen, "Password");

    expect(screen.getByText(/^signed-in .* no-offer/)).toBeOnTheScreen();
  });

  it("keeps biometrics off when turning them on throws", async () => {
    const screen = await renderWith(
      managerWith({ enableBiometrics: jest.fn().mockRejectedValue(new Error("keychain")) }),
    );
    await press(screen, "Password");

    await press(screen, "Enable");

    expect(screen.getByText("signed-in available disabled no-offer no-notice")).toBeOnTheScreen();
  });

  it("reads the phone's ability again on each render", async () => {
    const canUseBiometrics = jest.fn(() => true);
    const screen = await renderWith(managerWith({ canUseBiometrics }));
    canUseBiometrics.mockReturnValue(false);

    await press(screen, "Recovery");

    expect(screen.getByText(/^signed-in unavailable/)).toBeOnTheScreen();
  });
});
