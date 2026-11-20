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
// state block, a plain Rosa profundo line icon (no disc, FIX-089) over a Lora
// 24 title, the note, the Plan's facts, and real buttons.
describe("PaymentStatusView", () => {
  it.each([
    ["pending", "Tu pago está en revisión", "hourglass"],
    ["confirmed", "¡Pago confirmado!", "check"],
    ["rejected", "No pudimos confirmar tu pago", "alert"],
  ] as const)("draws the %s state with its title in the band", async (state, title, icon) => {
    const screen = await render(
      <PaymentStatusView
        endsOn="2026-12-01"
        onHome={jest.fn()}
        onPrimary={jest.fn()}
        payment={payment}
        state={state}
      />,
    );

    // Rosa Emma C11: the band holds the Lora 30 title and the glyph on a white disc.
    expect(screen.getByRole("header", { name: title })).toHaveStyle({ fontSize: 30 });
    expect(screen.getByTestId("payment-status-disc")).toHaveStyle({ backgroundColor: "#FFFBFB" });
    expect(screen.getByTestId(`payment-status-icon-${icon}`, hidden)).toHaveProp(
      "stroke",
      "#93615D",
    );
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
    expect(screen.getByText("mar 1 dic")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Reservar una clase" }));
    await fireEvent.press(screen.getByRole("button", { name: "Ir al inicio" }));
    expect(onPrimary).toHaveBeenCalled();
    expect(onHome).toHaveBeenCalled();
  });

  // FIX-090 (states review Y8): a reason without its full stop still ends
  // its sentence before «Sube uno nuevo…».
  it("ends the staff reason with a full stop before asking for a new receipt", async () => {
    const screen = await render(
      <PaymentStatusView
        onHome={jest.fn()}
        payment={{ ...payment, rejectionReason: "No vimos la transferencia recibida" }}
        state="rejected"
      />,
    );

    expect(
      screen.getByText("No vimos la transferencia recibida. Sube uno nuevo para activar tu plan."),
    ).toBeOnTheScreen();
  });
});
