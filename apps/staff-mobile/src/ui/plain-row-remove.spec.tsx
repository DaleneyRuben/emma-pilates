import { SwipeToRemove } from "@pilates/mobile-core";
import { fireEvent, render } from "@testing-library/react-native";

import { PlainRow } from "./plain-rows";

// E-F15: VoiceOver and TalkBack offer «Borrar» on the notice row they focus,
// as the swipe does by hand.
describe("A Staff notice row that swipes away", () => {
  it("offers «Borrar» as the focused row's own action", async () => {
    const onRemove = jest.fn();
    const screen = await render(
      <SwipeToRemove onRemove={onRemove}>
        <PlainRow label="Lucía pidió un congelamiento." onPress={jest.fn()} />
      </SwipeToRemove>,
    );
    const row = screen.getByRole("button", { name: "Lucía pidió un congelamiento." });

    expect(row.props.accessibilityActions).toEqual([{ name: "remove", label: "Borrar" }]);
    await fireEvent(row, "accessibilityAction", { nativeEvent: { actionName: "remove" } });

    expect(onRemove).toHaveBeenCalledTimes(1);
  });
});
