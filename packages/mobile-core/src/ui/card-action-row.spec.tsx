import { fireEvent, render } from "@testing-library/react-native";

import { CardActionRow, cardWithActionRow } from "./card-action-row";

// Follow-up 226 §1: under a card's content, an Arena hairline and then the
// action as a right-aligned text button; the card's bottom padding drops to 4.
describe("CardActionRow", () => {
  it("puts a right-aligned 44 pt text button under an Arena hairline", async () => {
    const onPress = jest.fn();
    const screen = await render(
      <CardActionRow label="Reprogramar" onPress={onPress} testID="reschedule" />,
    );

    const button = screen.getByTestId("reschedule");
    expect(button).toHaveStyle({ minHeight: 44, paddingHorizontal: 12 });
    expect(button.parent).toHaveStyle({
      borderTopColor: "#E6DBD0",
      borderTopWidth: 1,
      flexDirection: "row",
      justifyContent: "flex-end",
    });
    expect(screen.getByText("Reprogramar")).toHaveStyle({ color: "#7D4F4B", fontSize: 15 });
    await fireEvent.press(button);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("draws «Cancelar reserva» in Error", async () => {
    const screen = await render(
      <CardActionRow label="Cancelar reserva" onPress={jest.fn()} tone="error" />,
    );

    expect(screen.getByText("Cancelar reserva")).toHaveStyle({ color: "#A04E3E" });
  });

  it("gives the card a bottom padding of 4", () => {
    expect(cardWithActionRow).toEqual({ paddingBottom: 4 });
  });
});
