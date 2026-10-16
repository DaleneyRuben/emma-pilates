import { fireEvent, render } from "@testing-library/react-native";

import { PrimaryButton } from "./primary-button";

// MOB-060, design follow-up 93: a submitting button shows it is working.
describe("PrimaryButton while busy", () => {
  it("keeps its fill and shows a spinner in place of the label", async () => {
    const screen = await render(<PrimaryButton busy label="Iniciar sesión" />);

    const button = screen.getByRole("button", { name: "Iniciar sesión" });
    expect(button).toHaveStyle({ backgroundColor: "#B78380", minHeight: 52 });
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
