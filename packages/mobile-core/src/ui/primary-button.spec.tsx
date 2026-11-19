import { fireEvent, render } from "@testing-library/react-native";

import { PrimaryButton } from "./primary-button";

// MOB-060, design follow-up 93: a submitting button shows it is working.
describe("PrimaryButton while busy", () => {
  it("keeps its fill and shows a spinner in place of the label", async () => {
    const screen = await render(<PrimaryButton busy label="Iniciar sesión" />);

    const button = screen.getByRole("button", { name: "Iniciar sesión" });
    // FIX-089: Rosa profundo, radius 12.
    expect(button).toHaveStyle({ backgroundColor: "#93615D", borderRadius: 12, minHeight: 52 });
    expect(screen.getByTestId("primary-button-spinner")).toBeOnTheScreen();
    expect(screen.getByText("Iniciar sesión")).toHaveStyle({ opacity: 0 });
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
    expect(screen.getByText("Iniciar sesión")).not.toHaveStyle({ opacity: 0 });
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
  it("labels in Crema Work Sans SemiBold 16", async () => {
    const screen = await render(<PrimaryButton label="Reservar clase" />);

    expect(screen.getByText("Reservar clase")).toHaveStyle({
      color: "#F9F4F2",
      fontFamily: "WorkSans_600SemiBold",
      fontSize: 16,
    });
  });

  it("draws the error tone as the secondary button, never red", async () => {
    const screen = await render(<PrimaryButton label="Sí, cancelar" tone="error" />);

    expect(screen.getByRole("button", { name: "Sí, cancelar" })).toHaveStyle({
      backgroundColor: "#F9F4F2",
      borderColor: "#93615D",
      borderWidth: 1.5,
    });
    expect(screen.getByText("Sí, cancelar")).toHaveStyle({ color: "#93615D" });
  });

  it("draws disabled as Crema with an Arcilla border and shows the reason", async () => {
    const screen = await render(
      <PrimaryButton
        disabled
        disabledReason="No disponible: tu plan está congelado ese día"
        label="Reservar clase"
      />,
    );

    expect(screen.getByRole("button", { name: "Reservar clase" })).toHaveStyle({
      backgroundColor: "#F9F4F2",
      borderColor: "#CDA697",
      borderWidth: 1.5,
    });
    expect(screen.getByText("Reservar clase")).toHaveStyle({
      color: "#93615D",
      fontFamily: "WorkSans_500Medium",
    });
    expect(screen.getByText("No disponible: tu plan está congelado ese día")).toBeOnTheScreen();
  });

  it("hides the reason while the button can be pressed", async () => {
    const screen = await render(<PrimaryButton disabledReason="Motivo" label="Reservar clase" />);

    expect(screen.queryByText("Motivo")).toBeNull();
  });
});
