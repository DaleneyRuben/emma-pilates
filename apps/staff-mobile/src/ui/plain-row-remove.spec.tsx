import type { NotificationDto } from "@pilates/api-contracts";
import { SwipeToRemove } from "@pilates/mobile-core";
import { fireEvent, render } from "@testing-library/react-native";

import { ReviewSections } from "../notifications/review-sections";
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

  it("offers «Borrar» on E-F07's review rows, pending and decided", async () => {
    const notice = (id: string, title: string) =>
      ({
        createdAt: "2026-11-26T15:20:00.000Z",
        id,
        message: "Detalle",
        readAt: null,
        review: null,
        title,
      }) as unknown as NotificationDto;
    const onRemove = jest.fn();
    const screen = await render(
      <ReviewSections
        decided={[notice("2", "Pago aprobado")]}
        now={new Date("2026-11-26T18:00:00.000Z")}
        onOpen={jest.fn()}
        onRemove={onRemove}
        pending={[notice("1", "Comprobante nuevo")]}
      />,
    );

    for (const label of [/^Comprobante nuevo/, /^Pago aprobado/]) {
      const row = screen.getByLabelText(label);
      expect(row.props.accessibilityActions).toEqual([{ name: "remove", label: "Borrar" }]);
      await fireEvent(row, "accessibilityAction", { nativeEvent: { actionName: "remove" } });
    }
    expect(onRemove).toHaveBeenCalledTimes(2);
  });
});
