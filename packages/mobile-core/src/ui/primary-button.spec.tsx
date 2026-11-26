import { fireEvent, render } from "@testing-library/react-native";

import { PrimaryButton } from "./primary-button";
import { textVariants } from "./type-scale";

// MOB-060, design follow-up 93: a submitting button shows it is working.
describe("PrimaryButton while busy", () => {
  it("keeps its fill and shows a spinner in place of the label", async () => {
    const screen = await render(<PrimaryButton busy label="Iniciar sesión" />);

    const button = screen.getByRole("button", { name: "Iniciar sesión" });
    // FIX-089: Rosa profundo, radius 12.
    expect(button).toHaveStyle({ backgroundColor: "#93615D", borderRadius: 16, minHeight: 52 });
    expect(screen.getByTestId("primary-button-spinner")).toBeOnTheScreen();
    // The wrapper hides the label, never the text's own style (follow-up 285).
    expect(screen.getByTestId("button-label-hidden")).toHaveStyle({ opacity: 0 });
    expect(screen.getByText("Iniciar sesión")).not.toHaveStyle({ opacity: 0 });
  });

  it("tells screen readers it is busy and ignores taps", async () => {
    const onPress = jest.fn();
    const screen = await render(<PrimaryButton busy label="Iniciar sesión" onPress={onPress} />);

    const button = screen.getByRole("button", { name: "Iniciar sesión" });
    expect(button).toBeBusy();
    expect(button).toBeDisabled();
    await fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
  });

  it("shows the label and no spinner when idle", async () => {
    const screen = await render(<PrimaryButton label="Iniciar sesión" />);

    expect(screen.queryByTestId("primary-button-spinner")).toBeNull();
    expect(screen.queryByTestId("button-label-hidden")).toBeNull();
    expect(screen.getByRole("button", { name: "Iniciar sesión" })).not.toBeBusy();
  });
});

// MOB-066: Maestro and RNTL reach the button by a stable id, not its Spanish label.
describe("PrimaryButton testID", () => {
  it("puts the testID on the pressable button", async () => {
    const screen = await render(<PrimaryButton label="Iniciar sesión" testID="login-submit" />);

    expect(screen.getByTestId("login-submit")).toBe(
      screen.getByRole("button", { name: "Iniciar sesión" }),
    );
  });
});

// FIX-089 (palette B): Rosa profundo with a Crema Work Sans label; destructive
// actions take the secondary look; disabled says why.
describe("PrimaryButton palette B", () => {
  it("labels in white boton", async () => {
    const screen = await render(<PrimaryButton label="Reservar clase" />);

    expect(screen.getByText("Reservar clase")).toHaveStyle({
      ...textVariants.boton,
      color: "#FFFBFB",
    });
  });

  it("draws the error tone as the secondary button, never red", async () => {
    const screen = await render(<PrimaryButton label="Sí, cancelar" tone="error" />);

    expect(screen.getByRole("button", { name: "Sí, cancelar" })).toHaveStyle({
      backgroundColor: "#FFFBFB",
      borderColor: "#93615D",
      borderWidth: 1.5,
    });
    expect(screen.getByText("Sí, cancelar")).toHaveStyle({ color: "#93615D" });
  });

  it("draws disabled on 50 with a 400 border, the same weight, and says why", async () => {
    const screen = await render(
      <PrimaryButton
        disabled
        disabledReason="No disponible: tu plan está congelado ese día"
        label="Reservar clase"
      />,
    );

    expect(screen.getByRole("button", { name: "Reservar clase" })).toHaveStyle({
      backgroundColor: "#FEF6F2",
      borderColor: "#CDA697",
      borderWidth: 1.5,
    });
    expect(screen.getByText("Reservar clase")).toHaveStyle({
      ...textVariants.boton,
      color: "#93615D",
    });
    expect(screen.getByText("No disponible: tu plan está congelado ese día")).toHaveStyle(
      textVariants.secundario,
    );
  });

  it("hides the reason while the button can be pressed", async () => {
    const screen = await render(<PrimaryButton disabledReason="Motivo" label="Reservar clase" />);

    expect(screen.queryByText("Motivo")).toBeNull();
  });
});

// The testing session on Android (#24): «Subir factura» was measured a pixel
// short, so «factura» wrapped to a clipped second line and only «Subir»
// showed. A one-line label uses Android's simple line breaking, which
// measures and lays out the same way.
describe("PrimaryButton label on Android", () => {
  it("breaks its one line the simple way", async () => {
    const screen = await render(<PrimaryButton label="Subir factura" />);

    expect(screen.getByText("Subir factura")).toHaveProp("textBreakStrategy", "simple");
  });
});
