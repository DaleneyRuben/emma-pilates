import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import { Pressable } from "react-native";

import { BiometricOffer } from "./biometric-offer";
import { MobileIdentityProvider, useMobileIdentity } from "./identity-provider";
import type { SessionManager } from "./session-manager";
import { Text } from "../ui/text";

const session = { accountId: "account-1", role: "client" as const };

function managerWith(enableBiometrics: jest.Mock) {
  return {
    canUseBiometrics: () => true,
    declineBiometricOffer: jest.fn().mockResolvedValue(undefined),
    disableBiometrics: jest.fn(),
    enableBiometrics,
    endLocally: jest.fn(),
    getCredential: jest.fn().mockResolvedValue(null),
    hasBiometricSession: jest.fn().mockResolvedValue(false),
    isBiometricsEnabled: jest.fn().mockResolvedValue(false),
    logout: jest.fn(),
    refresh: jest.fn(),
    restore: jest.fn().mockResolvedValue(null),
    start: jest.fn().mockResolvedValue(session),
    unlockWithBiometrics: jest.fn(),
    wasBiometricOfferDeclined: jest.fn().mockResolvedValue(false),
  } satisfies SessionManager;
}

function SignIn() {
  const identity = useMobileIdentity();
  return (
    <Pressable
      accessibilityLabel="Sign in"
      accessibilityRole="button"
      onPress={() => void identity.start("password", { offerBiometrics: true })}
    >
      <Text variant="boton">{identity.status}</Text>
    </Pressable>
  );
}

async function signInWith(manager: SessionManager) {
  const screen = await render(
    <MobileIdentityProvider manager={manager}>
      <SignIn />
      <BiometricOffer />
    </MobileIdentityProvider>,
  );
  await waitFor(() => expect(screen.getByText("signed-out")).toBeOnTheScreen());
  await act(async () => {
    await fireEvent.press(screen.getByRole("button", { name: "Sign in" }));
  });
  return screen;
}

describe("BiometricOffer", () => {
  it("shows the offer after a password sign-in and confirms with a toast", async () => {
    const manager = managerWith(jest.fn().mockResolvedValue(true));
    const screen = await signInWith(manager);

    expect(screen.getByRole("header", { name: "¿Entrar con Face ID?" })).toBeOnTheScreen();
    await act(async () => {
      await fireEvent.press(screen.getByRole("button", { name: "Usar Face ID" }));
    });

    expect(manager.enableBiometrics).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("header", { name: "¿Entrar con Face ID?" })).toBeNull();
    expect(screen.getByText("Listo: la próxima vez entras con Face ID.")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Cerrar aviso" }));
    expect(screen.queryByText("Listo: la próxima vez entras con Face ID.")).toBeNull();
  });

  it("closes without a toast when the prompt is cancelled", async () => {
    const screen = await signInWith(managerWith(jest.fn().mockResolvedValue(false)));

    await act(async () => {
      await fireEvent.press(screen.getByRole("button", { name: "Usar Face ID" }));
    });

    expect(screen.queryByRole("header", { name: "¿Entrar con Face ID?" })).toBeNull();
    expect(screen.queryByText(/^Listo/)).toBeNull();
  });

  it("remembers «Ahora no»", async () => {
    const manager = managerWith(jest.fn());
    const screen = await signInWith(manager);

    await act(async () => {
      await fireEvent.press(screen.getByRole("button", { name: "Ahora no" }));
    });

    expect(manager.declineBiometricOffer).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("header", { name: "¿Entrar con Face ID?" })).toBeNull();
  });
});
