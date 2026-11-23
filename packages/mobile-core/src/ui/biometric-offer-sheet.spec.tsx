import { fireEvent, render } from "@testing-library/react-native";
import { Platform } from "react-native";

import { BiometricOfferSheet } from "./biometric-offer-sheet";

const hidden = { includeHiddenElements: true };

// «Opción A»: the offer right after a password sign-in.
describe("BiometricOfferSheet", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("offers Face ID on iOS with the glyph on its disc", async () => {
    const onEnable = jest.fn();
    const onDismiss = jest.fn();
    const screen = await render(
      <BiometricOfferSheet onDismiss={onDismiss} onEnable={onEnable} visible />,
    );

    expect(screen.getByRole("header", { name: "Entra más rápido" })).toBeOnTheScreen();
    expect(
      screen.getByText("La próxima vez entra con Face ID, sin escribir tu contraseña."),
    ).toBeOnTheScreen();
    expect(screen.getByText("Puedes cambiarlo cuando quieras en Perfil.")).toBeOnTheScreen();
    expect(screen.getByTestId("biometric-offer-disc")).toHaveStyle({
      backgroundColor: "#F9E7DF",
      height: 72,
      width: 72,
    });
    expect(screen.getByTestId("glyph-fingerprint", hidden)).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole("button", { name: "Usar Face ID" }));
    expect(onEnable).toHaveBeenCalledTimes(1);
    await fireEvent.press(screen.getByRole("button", { name: "Ahora no" }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("offers the fingerprint on Android", async () => {
    jest.replaceProperty(Platform, "OS", "android");
    const screen = await render(
      <BiometricOfferSheet onDismiss={jest.fn()} onEnable={jest.fn()} visible />,
    );

    expect(
      screen.getByText("La próxima vez entra con tu huella, sin escribir tu contraseña."),
    ).toBeOnTheScreen();
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
