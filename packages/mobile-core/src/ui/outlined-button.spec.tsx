import { fireEvent, render } from "@testing-library/react-native";

import { OutlinedButton } from "./outlined-button";
import { textVariants } from "./type-scale";

// UX-002: the secondary action every confirmation sheet draws, shared by both
// apps. FIX-089 (palette B): Crema with a 1.5 Rosa profundo border; the
// destructive tone looks the same, since a confirmation guards it, never red.
describe("OutlinedButton", () => {
  it("outlines the secondary action in Rosa profundo on Crema, radius 12", async () => {
    const screen = await render(<OutlinedButton label="Ver historial" onPress={jest.fn()} />);

    expect(screen.getByRole("button", { name: "Ver historial" })).toHaveStyle({
      backgroundColor: "#FFFBFB",
      borderColor: "#93615D",
      borderRadius: 16,
      borderWidth: 1.5,
      minHeight: 52,
    });
    expect(screen.getByText("Ver historial")).toHaveStyle({
      ...textVariants.boton,
      color: "#93615D",
    });
  });

  it("draws the destructive tone like the secondary one", async () => {
    const onPress = jest.fn();
    const screen = await render(
      <OutlinedButton
        label="Cerrar sesión"
        onPress={onPress}
        testID="logout-confirm"
        tone="error"
      />,
    );

    const button = screen.getByTestId("logout-confirm");
    expect(button).toBe(screen.getByRole("button", { name: "Cerrar sesión" }));
    expect(button).toHaveStyle({ backgroundColor: "#FFFBFB", borderColor: "#93615D" });
    expect(screen.getByText("Cerrar sesión")).toHaveStyle({ color: "#93615D" });
    await fireEvent.press(button);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("draws disabled with an Arcilla border", async () => {
    const screen = await render(<OutlinedButton disabled label="Ver" onPress={jest.fn()} />);

    expect(screen.getByRole("button", { name: "Ver" })).toHaveStyle({ borderColor: "#CDA697" });
  });

  it("shows a spinner in place of the label and ignores taps while busy", async () => {
    const onPress = jest.fn();
    const screen = await render(<OutlinedButton busy label="Cerrar sesión" onPress={onPress} />);

    const button = screen.getByRole("button", { name: "Cerrar sesión" });
    expect(button).toBeBusy();
    expect(button).toBeDisabled();
    expect(screen.getByTestId("button-spinner")).toBeOnTheScreen();
    expect(screen.getByTestId("button-label-hidden")).toHaveStyle({ opacity: 0 });
    await fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
  });
});

// MOB-066: Maestro reaches the button by a stable id instead of its Spanish label.
describe("OutlinedButton testID", () => {
  it("puts the testID on the pressable button", async () => {
    const screen = await render(
      <OutlinedButton
        label="Registrar pago en efectivo"
        onPress={jest.fn()}
        testID="client-overview-cash"
      />,
    );

    expect(screen.getByTestId("client-overview-cash")).toBe(
      screen.getByRole("button", { name: "Registrar pago en efectivo" }),
    );
  });
});
