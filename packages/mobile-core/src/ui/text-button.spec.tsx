import { fireEvent, render } from "@testing-library/react-native";

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
