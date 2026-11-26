import { fireEvent, render } from "@testing-library/react-native";

import { Text } from "./text";
import { SwipeToRemove } from "./swipe-to-remove";

// Walkthrough n.º 10 (C19c, E-F15): a swipe to the left shows «Borrar»;
// VoiceOver and TalkBack reach the same action from the row.
describe("SwipeToRemove", () => {
  it("removes the row from its «Borrar» button", async () => {
    const onRemove = jest.fn();
    const screen = await render(
      <SwipeToRemove onRemove={onRemove} testID="row">
        <Text variant="cuerpo">Pago confirmado</Text>
      </SwipeToRemove>,
    );

    await fireEvent.press(screen.getByRole("button", { name: "Borrar" }));

    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it("offers «Borrar» as an accessibility action", async () => {
    const onRemove = jest.fn();
    const screen = await render(
      <SwipeToRemove onRemove={onRemove} testID="row">
        <Text variant="cuerpo">Pago confirmado</Text>
      </SwipeToRemove>,
    );
    const row = screen.getByTestId("row");

    expect(row.props.accessibilityActions).toEqual([{ name: "remove", label: "Borrar" }]);
    await fireEvent(row, "accessibilityAction", { nativeEvent: { actionName: "remove" } });

    expect(onRemove).toHaveBeenCalledTimes(1);
  });
});
