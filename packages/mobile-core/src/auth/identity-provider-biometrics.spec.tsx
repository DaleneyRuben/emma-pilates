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
    unlockWithBiometrics: jest.fn().mockResolvedValue(session),
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

  return (
    <>
      <Text variant="cuerpo">{flags.join(" ")}</Text>
      <Action
        onPress={() => identity.start("password", { offerBiometrics: true })}
        title="Password"
      />
      <Action onPress={() => identity.start("recovery")} title="Recovery" />
      <Action onPress={() => identity.unlockWithBiometrics()} title="Unlock" />
      <Action onPress={() => identity.logout()} title="Logout" />
      <Action onPress={() => biometrics.enable()} title="Enable" />
      <Action onPress={() => biometrics.disable()} title="Disable" />
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
    ["the offer was declined before", { wasBiometricOfferDeclined: jest.fn().mockResolvedValue(true) }],
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
    expect(screen.getByText("biometric-locked available enabled no-offer no-notice")).toBeOnTheScreen();

    await press(screen, "Unlock");
    expect(screen.getByText("signed-in available enabled no-offer no-notice")).toBeOnTheScreen();

    await press(screen, "Disable");
    expect(manager.disableBiometrics).toHaveBeenCalledTimes(1);
    expect(screen.getByText("signed-in available disabled no-offer no-notice")).toBeOnTheScreen();
  });

  it("stays locked when the unlock prompt is cancelled", async () => {
    const manager = managerWith({
      hasBiometricSession: jest.fn().mockResolvedValue(true),
      unlockWithBiometrics: jest.fn().mockRejectedValue(new Error("User canceled")),
    });
    const screen = await renderWith(manager);

    await press(screen, "Unlock");

    expect(screen.getByText(/^biometric-locked available enabled/)).toBeOnTheScreen();
    expect(manager.logout).not.toHaveBeenCalled();
  });

  it("forgets the enabled state on logout", async () => {
    const manager = managerWith({ hasBiometricSession: jest.fn().mockResolvedValue(true) });
    const screen = await renderWith(manager);
    await press(screen, "Unlock");

    await press(screen, "Logout");

    expect(screen.getByText("signed-out available disabled no-offer no-notice")).toBeOnTheScreen();
  });
});
