import { fireEvent, render } from "@testing-library/react-native";

import { OutlinedButton } from "./outlined-button";

// UX-002: the secondary action every confirmation sheet draws, shared by both
// apps. Follow-up 225 fills it instead of outlining it: Rosa tinte with a Rosa
// enlace label, or the Error tint with an Error label.
describe("OutlinedButton", () => {
  it("fills the secondary action on Rosa tinte with a Rosa enlace label, radius 14", async () => {
    const screen = await render(<OutlinedButton label="Ver historial" onPress={jest.fn()} />);

    expect(screen.getByRole("button", { name: "Ver historial" })).toHaveStyle({
      backgroundColor: "#F2E4E1",
      borderRadius: 14,
      borderWidth: 0,
      minHeight: 52,
    });
    expect(screen.getByText("Ver historial")).toHaveStyle({ color: "#7D4F4B", fontWeight: "600" });
  });

  it("fills the destructive tone on the Error tint with an Error label", async () => {
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
    expect(button).toHaveStyle({ backgroundColor: "#F7E5E0", borderWidth: 0 });
    expect(screen.getByText("Cerrar sesión")).toHaveStyle({ color: "#A04E3E" });
    await fireEvent.press(button);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("shows a spinner in place of the label and ignores taps while busy", async () => {
    const onPress = jest.fn();
    const screen = await render(<OutlinedButton busy label="Cerrar sesión" onPress={onPress} />);

    const button = screen.getByRole("button", { name: "Cerrar sesión" });
    expect(button).toBeBusy();
    expect(button).toBeDisabled();
    expect(screen.getByTestId("button-spinner")).toBeOnTheScreen();
    expect(screen.getByText("Cerrar sesión")).toHaveStyle({ opacity: 0 });
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
