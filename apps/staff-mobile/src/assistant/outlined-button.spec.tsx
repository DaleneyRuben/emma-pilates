import { render } from "@testing-library/react-native";

import { OutlinedButton } from "./outlined-button";

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
