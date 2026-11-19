import {
  appointmentLead,
  appointmentPayment,
  appointmentWhen,
  firstName,
  slotDayLabel,
} from "./evaluation-appointment-format";

// C5 pick C: the appointment block's words.
const at = (civilDate: string, time: string) => `${civilDate}T${time}:00.000-04:00`;

describe("evaluation appointment format", () => {
  it("counts the days to her appointment, with hoy and mañana", () => {
    expect(appointmentLead(at("2026-11-19", "18:00"), "2026-11-19")).toBe("Tu cita · hoy");
    expect(appointmentLead(at("2026-11-20", "07:00"), "2026-11-19")).toBe("Tu cita · mañana");
    expect(appointmentLead(at("2026-11-23", "09:45"), "2026-11-19")).toBe("Tu cita · en 4 días");
    expect(appointmentLead(at("2026-12-02", "09:45"), "2026-11-19")).toBe("Tu cita · en 13 días");
  });

  it("writes the date and time with a capital weekday", () => {
    expect(appointmentWhen(at("2026-11-23", "09:45"))).toBe("Lun 23 nov · 09:45");
  });

  it("leaves the month out of a slot's day only in the current month", () => {
    expect(slotDayLabel(at("2026-11-25", "10:30"), "2026-11-19")).toBe("mié 25");
    expect(slotDayLabel(at("2026-12-02", "11:15"), "2026-11-19")).toBe("mié 2 dic");
  });

  it("says what she pays: free, paid with its state, or the state alone", () => {
    expect(appointmentPayment({ included: true, paymentState: null, priceCentavos: 0 })).toBe(
      "Gratis · primera del trimestre",
    );
    expect(
      appointmentPayment({ included: false, paymentState: "confirmed", priceCentavos: 10_000 }),
    ).toBe("Bs 100 · Pagada");
    expect(appointmentPayment({ included: false, paymentState: "pending", priceCentavos: 0 })).toBe(
      "Pago en revisión",
    );
  });

  it("takes the nutritionist's first name", () => {
    expect(firstName("Gabriela Flores")).toBe("Gabriela");
    expect(firstName("  Ana ")).toBe("Ana");
  });
});
