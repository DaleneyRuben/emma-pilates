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

// Follow-up 225 §4: a Text button is Rosa enlace Work Sans 600 15 with no
// underline and a 44 pt tap height; the Error tone is 226's «Cancelar reserva».
describe("TextButton v2 look", () => {
  it("draws Rosa enlace Work Sans 600 15 without an underline, 44 pt tall", async () => {
    const screen = await render(<TextButton label="Ahora no" onPress={jest.fn()} />);

    const label = screen.getByText("Ahora no");
    expect(label).toHaveStyle({
      color: "#7D4F4B",
      fontFamily: "WorkSans_600SemiBold",
      fontSize: 15,
      fontWeight: "600",
    });
    expect(StyleSheet.flatten(label.props.style)).not.toHaveProperty("textDecorationLine");
    expect(screen.getByRole("button", { name: "Ahora no" })).toHaveStyle({ minHeight: 44 });
  });

  it("draws the Error tone in #A04E3E", async () => {
    const screen = await render(
      <TextButton label="Cancelar reserva" onPress={jest.fn()} tone="error" />,
    );

    expect(screen.getByText("Cancelar reserva")).toHaveStyle({ color: "#A04E3E" });
  });
});
