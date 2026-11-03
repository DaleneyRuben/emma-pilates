import { fireEvent, render } from "@testing-library/react-native";

import { PaymentStatusView } from "./payment-status-view";

const hidden = { includeHiddenElements: true };

const payment = {
  amountDueCentavos: 69_700,
  classAllowance: 12,
  planName: "12 clases",
  rejectionReason: "El monto del comprobante no coincide con el plan.",
};

// Follow-up 225 §6 and the walkthrough (n.º 15): screen 11 is the centred v2
// state block, a line icon in a 72 pt disc over a Lora 24 title, the note,
// the Plan's facts, and real buttons instead of «Volver al inicio» as a link.
describe("PaymentStatusView", () => {
  it.each([
    ["pending", "Tu pago está en revisión", "hourglass", "#F2E4E1", "#93615D"],
    ["confirmed", "¡Pago confirmado!", "check", "#F2E4E1", "#93615D"],
    ["rejected", "No pudimos confirmar tu pago", "alert", "#F7E5E0", "#A04E3E"],
  ] as const)("draws the %s state as the v2 block", async (state, title, icon, disc, stroke) => {
    const screen = await render(
      <PaymentStatusView
        endsOn="2026-12-01"
        onHome={jest.fn()}
        onPrimary={jest.fn()}
        payment={payment}
        state={state}
      />,
    );

    expect(screen.getByRole("header", { name: title })).toHaveStyle({ fontSize: 24 });
    expect(screen.getByTestId("state-screen-disc")).toHaveStyle({ backgroundColor: disc });
    expect(screen.getByTestId(`state-screen-icon-${icon}`, hidden)).toHaveProp("stroke", stroke);
    expect(screen.getByTestId("payment-status-facts")).toBeOnTheScreen();
    expect(screen.getByText("12 clases")).toBeOnTheScreen();
  });

  it("shows the owner's pending copy and the amount", async () => {
    const screen = await render(
      <PaymentStatusView onHome={jest.fn()} payment={payment} state="pending" />,
    );

    expect(
      screen.getByText(
        "Nuestro equipo está revisando tu comprobante. Suele tomar unos minutos en horario de atención. Te avisaremos apenas esté listo.",
      ),
    ).toBeOnTheScreen();
    expect(screen.getByText("Bs 697")).toBeOnTheScreen();
  });

  it("offers booking and home once confirmed, with the end date", async () => {
    const onPrimary = jest.fn();
    const onHome = jest.fn();
    const screen = await render(
      <PaymentStatusView
        endsOn="2026-12-01"
        onHome={onHome}
        onPrimary={onPrimary}
        payment={payment}
        state="confirmed"
      />,
    );

    expect(
      screen.getByText("Tu plan ya está activo. Nos vemos pronto en el estudio."),
    ).toBeOnTheScreen();
    expect(screen.getByText("Vence")).toBeOnTheScreen();
    expect(screen.getByText("1 de diciembre")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Reservar una clase" }));
    await fireEvent.press(screen.getByRole("button", { name: "Ir al inicio" }));
    expect(onPrimary).toHaveBeenCalled();
    expect(onHome).toHaveBeenCalled();
  });
});
