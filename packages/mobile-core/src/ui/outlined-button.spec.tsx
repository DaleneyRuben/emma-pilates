import { fireEvent, render } from "@testing-library/react-native";

import { OutlinedButton } from "./outlined-button";

// UX-002: the outlined action every confirmation sheet draws, shared by both apps.
describe("OutlinedButton", () => {
  it("draws the Error outline and label for the destructive tone", async () => {
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
    expect(button).toHaveStyle({ borderColor: "#B25D4B", backgroundColor: "transparent" });
    expect(screen.getByText("Cerrar sesión")).toHaveStyle({ color: "#94493A" });
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
