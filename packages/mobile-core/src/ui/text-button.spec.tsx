import { fireEvent, render } from "@testing-library/react-native";

import { TextButton } from "./text-button";
import { textVariants } from "./type-scale";

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

// Follow-up 285: a standalone link or action is `enlace`, Work Sans 14 · 700,
// always underlined, in ink, with a 44 pt tap height; the Error tone and a
// disabled link stay ink (an error is said in words, never in colour).
describe("TextButton", () => {
  it("draws enlace in ink, underlined, 44 pt tall", async () => {
    const screen = await render(<TextButton label="Ahora no" onPress={jest.fn()} />);

    expect(screen.getByText("Ahora no")).toHaveStyle({ ...textVariants.enlace, color: "#93615D" });
    expect(screen.getByRole("button", { name: "Ahora no" })).toHaveStyle({ minHeight: 44 });
  });

  it("draws every link, disabled or not, in the same ink", async () => {
    const screen = await render(
      <>
        <TextButton label="Cancelar reserva" onPress={jest.fn()} />
        <TextButton disabled label="Volver" onPress={jest.fn()} />
      </>,
    );

    expect(screen.getByText("Cancelar reserva")).toHaveStyle({ color: "#93615D" });
    expect(screen.getByText("Volver")).toHaveStyle({ color: "#93615D" });
    expect(screen.getByRole("button", { name: "Volver" })).toBeDisabled();
  });
});
