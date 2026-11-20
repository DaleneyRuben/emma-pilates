import { fireEvent, render } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

import { TextButton } from "./text-button";

// MOB-066: Maestro and RNTL reach the link by a stable id, not its Spanish label.
describe("TextButton testID", () => {
  it("puts the testID on the pressable link", async () => {
    const onPress = jest.fn();
    const screen = await render(
      <TextButton label="¿Olvidaste tu contraseña?" onPress={onPress} testID="login-forgot" />,
    );

    const link = screen.getByTestId("login-forgot");
    expect(link).toBe(screen.getByRole("button", { name: "¿Olvidaste tu contraseña?" }));
    await fireEvent.press(link);
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});

// Rosa Emma: a Text button is rosa profundo Work Sans 700 15 with a 44 pt tap
// height, underlined only where the board draws a link; the Error tone is
// 226's «Cancelar reserva».
describe("TextButton", () => {
  it("draws rosa profundo Work Sans 700 15 without an underline, 44 pt tall", async () => {
    const screen = await render(<TextButton label="Ahora no" onPress={jest.fn()} />);

    const label = screen.getByText("Ahora no");
    expect(label).toHaveStyle({
      color: "#93615D",
      fontFamily: "WorkSans_700Bold",
      fontSize: 15,
      fontWeight: "700",
    });
    expect(StyleSheet.flatten(label.props.style)).not.toHaveProperty("textDecorationLine");
    expect(screen.getByRole("button", { name: "Ahora no" })).toHaveStyle({ minHeight: 44 });
  });

  it("underlines a link when asked", async () => {
    const screen = await render(<TextButton label="Volver" onPress={jest.fn()} underline />);

    expect(screen.getByText("Volver")).toHaveStyle({ textDecorationLine: "underline" });
  });

  it("draws the Error tone in #93615D", async () => {
    const screen = await render(
      <TextButton label="Cancelar reserva" onPress={jest.fn()} tone="error" />,
    );

    expect(screen.getByText("Cancelar reserva")).toHaveStyle({ color: "#93615D" });
  });
});
