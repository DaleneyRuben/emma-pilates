import { fireEvent, render } from "@testing-library/react-native";
import { Pressable } from "react-native";

import { Text } from "./text";
import { SwipeToRemove, useRemoveAction } from "./swipe-to-remove";

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

    await fireEvent.press(
      screen.getByRole("button", { name: "Borrar", includeHiddenElements: true }),
    );

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

  // The frame is no screen reader element: the focusable row inside it must
  // carry «Borrar» itself for VoiceOver and TalkBack to offer it.
  it("hands «Borrar» to the focusable row inside it", async () => {
    const onRemove = jest.fn();
    function Row() {
      return (
        <Pressable accessibilityLabel="Pago confirmado" onPress={jest.fn()} {...useRemoveAction()}>
          <Text variant="cuerpo">Pago confirmado</Text>
        </Pressable>
      );
    }
    const screen = await render(
      <SwipeToRemove onRemove={onRemove}>
        <Row />
      </SwipeToRemove>,
    );
    const row = screen.getByLabelText("Pago confirmado");

    expect(row.props.accessibilityActions).toEqual([{ name: "remove", label: "Borrar" }]);
    await fireEvent(row, "accessibilityAction", { nativeEvent: { actionName: "remove" } });

    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it("gives Maestro an id for «Borrar»", async () => {
    const screen = await render(
      <SwipeToRemove onRemove={jest.fn()} testID="row">
        <Text variant="cuerpo">Pago confirmado</Text>
      </SwipeToRemove>,
    );

    expect(screen.getByTestId("row-remove", { includeHiddenElements: true })).toBeTruthy();
  });

  it("offers no action to a row outside a swipe", async () => {
    function Row() {
      return (
        <Pressable accessibilityLabel="Pago confirmado" onPress={jest.fn()} {...useRemoveAction()}>
          <Text variant="cuerpo">Pago confirmado</Text>
        </Pressable>
      );
    }
    const screen = await render(<Row />);

    expect(screen.getByLabelText("Pago confirmado").props.accessibilityActions).toBeUndefined();
  });
});
