import type { NotificationDto } from "@pilates/api-contracts";
import { fireEvent, render } from "@testing-library/react-native";

import { NotificationGroup } from "./notification-row";

const hidden = { includeHiddenElements: true };
const now = new Date("2026-09-22T15:00:00.000Z");

function notification(overrides: Partial<NotificationDto>): NotificationDto {
  return {
    id: "n1",
    category: "subscription_payment",
    type: "payment_confirmed",
    title: "Pago confirmado",
    message: "Tu plan de 8 clases ya está activo.",
    destinationType: "subscription",
    destinationId: "subscription-1",
    createdAt: "2026-09-22T14:20:00.000Z",
    readAt: null,
    ...overrides,
  };
}

const confirmed = notification({});
const invoice = notification({
  id: "n2",
  type: "invoice_ready",
  title: "Tu factura está lista",
  message: "Ya puedes ver la factura de tu plan.",
  readAt: "2026-09-22T14:30:00.000Z",
});

// C2 C (owner 2026-11-19): topic icons and a direct action on Crema cards.
describe("NotificationGroup", () => {
  it("draws the notices on a Crema card with an Arcilla border", async () => {
    const screen = await render(
      <NotificationGroup items={[confirmed, invoice]} now={now} onOpen={jest.fn()} />,
    );

    expect(screen.getByTestId("notification-group")).toHaveStyle({
      backgroundColor: "#FFFBFB",
      borderRadius: 20,
    });
    expect(screen.getByTestId("notification-divider")).toHaveStyle({ backgroundColor: "#F9E7DF" });
  });

  it("shows the title and the message of each notice", async () => {
    const screen = await render(
      <NotificationGroup items={[confirmed]} now={now} onOpen={jest.fn()} />,
    );

    expect(screen.getByText("Pago confirmado")).toBeOnTheScreen();
    expect(screen.getByText("Tu plan de 8 clases ya está activo.")).toBeOnTheScreen();
    expect(screen.getByText("Hace 40 minutos")).toBeOnTheScreen();
  });

  it("puts a new notice's topic icon in Crema on a Palo de rosa circle, with a dot by the time", async () => {
    const screen = await render(
      <NotificationGroup items={[confirmed]} now={now} onOpen={jest.fn()} />,
    );

    expect(screen.getByTestId("notification-icon-n1")).toHaveStyle({
      backgroundColor: "#93615D",
      borderRadius: 20,
      height: 40,
      width: 40,
    });
    expect(screen.getByTestId("notification-glyph-card", hidden)).toHaveProp("stroke", "#FFFBFB");
    expect(screen.getByTestId("notification-new-dot")).toHaveStyle({ backgroundColor: "#93615D" });
  });

  it("puts a read notice's icon in Rosa profundo on a Rubor circle, without the dot", async () => {
    const screen = await render(
      <NotificationGroup items={[invoice]} now={now} onOpen={jest.fn()} />,
    );

    expect(screen.getByTestId("notification-icon-n2")).toHaveStyle({ backgroundColor: "#FEF6F2" });
    expect(screen.getByTestId("notification-glyph-document", hidden)).toHaveProp(
      "stroke",
      "#93615D",
    );
    expect(screen.queryByTestId("notification-new-dot")).toBeNull();
  });

  it("opens a notice from its row and runs its direct action from the link", async () => {
    const onOpen = jest.fn();
    const onAction = jest.fn();
    const screen = await render(
      <NotificationGroup
        actionFor={(item) =>
          item.type === "invoice_ready" ? { label: "Ver factura", onPress: onAction } : null
        }
        items={[confirmed, invoice]}
        now={now}
        onOpen={onOpen}
      />,
    );

    await fireEvent.press(screen.getByRole("button", { name: "Ver factura" }));
    expect(onAction).toHaveBeenCalledTimes(1);
    expect(onOpen).not.toHaveBeenCalled();

    await fireEvent.press(
      screen.getByRole("button", { name: "Pago confirmado. Tu plan de 8 clases ya está activo." }),
    );
    expect(onOpen).toHaveBeenCalledWith(confirmed);
    expect(screen.getAllByRole("button")).toHaveLength(3);
  });

  // C19c: VoiceOver and TalkBack offer «Borrar» on the row they focus.
  it("offers «Borrar» as the swiped row's own action", async () => {
    const onRemove = jest.fn();
    const screen = await render(
      <NotificationGroup items={[confirmed]} now={now} onOpen={jest.fn()} onRemove={onRemove} />,
    );
    const row = screen.getByRole("button", {
      name: "Pago confirmado. Tu plan de 8 clases ya está activo.",
    });

    expect(row.props.accessibilityActions).toEqual([{ name: "remove", label: "Borrar" }]);
    await fireEvent(row, "accessibilityAction", { nativeEvent: { actionName: "remove" } });

    expect(onRemove).toHaveBeenCalledWith(confirmed);
  });
});
