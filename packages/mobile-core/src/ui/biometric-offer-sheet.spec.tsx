import { fireEvent, render } from "@testing-library/react-native";
import { Platform } from "react-native";

import { BiometricOfferSheet } from "./biometric-offer-sheet";

const hidden = { includeHiddenElements: true };

// «Opción A»: the offer right after a password sign-in.
describe("BiometricOfferSheet", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  // Owner, 2026-11-23 (canvas D, iOS-4): the disc, one question, two answers.
  it("asks about Face ID on iOS and nothing more", async () => {
    const onEnable = jest.fn();
    const onDismiss = jest.fn();
    const screen = await render(
      <BiometricOfferSheet onDismiss={onDismiss} onEnable={onEnable} visible />,
    );

    expect(screen.getByRole("header", { name: "¿Entrar con Face ID?" })).toBeOnTheScreen();
    expect(screen.queryByText(/sin escribir tu contraseña/)).toBeNull();
    expect(screen.queryByText(/Perfil/)).toBeNull();
    expect(screen.getByTestId("biometric-offer-disc")).toHaveStyle({
      backgroundColor: "#F9E7DF",
      height: 72,
      width: 72,
    });
    expect(screen.getByTestId("glyph-faceId", hidden)).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole("button", { name: "Usar Face ID" }));
    expect(onEnable).toHaveBeenCalledTimes(1);
    await fireEvent.press(screen.getByRole("button", { name: "Ahora no" }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("asks about the fingerprint on Android", async () => {
    jest.replaceProperty(Platform, "OS", "android");
    const screen = await render(
      <BiometricOfferSheet onDismiss={jest.fn()} onEnable={jest.fn()} visible />,
    );

    expect(screen.getByRole("header", { name: "¿Entrar con tu huella?" })).toBeOnTheScreen();
    expect(screen.getByTestId("glyph-fingerprint", hidden)).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Usar mi huella" })).toBeOnTheScreen();
  });

  it("locks both actions while the prompt is open", async () => {
    const onDismiss = jest.fn();
    const screen = await render(
      <BiometricOfferSheet busy onDismiss={onDismiss} onEnable={jest.fn()} visible />,
    );

    await fireEvent.press(screen.getByRole("button", { name: "Ahora no" }));
    expect(onDismiss).not.toHaveBeenCalled();
  });
});
