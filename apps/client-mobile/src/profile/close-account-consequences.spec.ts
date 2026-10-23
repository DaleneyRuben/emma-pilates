import { describeAccountClosure } from "./close-account-consequences";

const always = [
  "Cerramos tu sesión en todos tus dispositivos.",
  "Tu correo queda libre por si quieres registrarte de nuevo.",
];

const nothing = {
  bookings: [],
  evaluations: [],
  latestPayment: null,
  subscription: { status: "none" as const, subscription: null },
};

describe("describeAccountClosure", () => {
  it("lists only the two lines that always apply to a Client with nothing ahead", () => {
    expect(describeAccountClosure(nothing)).toEqual({
      blocked: false,
      lines: always,
    });
  });

  it("names every consequence with its numbers", () => {
    expect(
      describeAccountClosure({
        bookings: [{ kind: "booking" }, { kind: "booking" }, { kind: "waitlist" }],
        evaluations: [{ state: "booked" }],
        latestPayment: { method: "transfer", state: "confirmed" },
        subscription: {
          status: "active",
          subscription: { planName: "Mensual 16 clases", remainingClassAllowance: 11 },
        },
      }).lines,
    ).toEqual([
      "Cancelamos tus 2 reservas futuras y tu evaluación nutricional pendiente. No se descuenta nada.",
      "Sales de 1 lista de espera.",
      "Tu plan Mensual 16 clases termina hoy. No se devuelve dinero y pierdes las 11 clases que te quedan.",
      ...always,
    ]);
  });

  it("uses the singular for one Booking, one class, and several Waitlists and Evaluations", () => {
    expect(
      describeAccountClosure({
        ...nothing,
        bookings: [{ kind: "booking" }, { kind: "waitlist" }, { kind: "waitlist" }],
        evaluations: [{ state: "booked" }, { state: "booked" }],
        subscription: {
          status: "expiring_soon",
          subscription: { planName: "Paquete de 8 clases", remainingClassAllowance: 1 },
        },
      }).lines.slice(0, 3),
    ).toEqual([
      "Cancelamos tu reserva futura y tus 2 evaluaciones nutricionales pendientes. No se descuenta nada.",
      "Sales de 2 listas de espera.",
      "Tu plan Paquete de 8 clases termina hoy. No se devuelve dinero y pierdes la clase que te queda.",
    ]);
  });

  it("mentions an Evaluation alone and a plan with no classes left", () => {
    expect(
      describeAccountClosure({
        ...nothing,
        evaluations: [{ state: "booked" }, { state: "cancelled" }],
        subscription: {
          status: "active",
          subscription: { planName: "Paquete de 12 clases", remainingClassAllowance: 0 },
        },
      }).lines.slice(0, 2),
    ).toEqual([
      "Cancelamos tu evaluación nutricional pendiente. No se descuenta nada.",
      "Tu plan Paquete de 12 clases termina hoy. No se devuelve dinero.",
    ]);
  });

  it("leaves out an expired plan", () => {
    expect(
      describeAccountClosure({
        ...nothing,
        subscription: {
          status: "expired",
          subscription: { planName: "Paquete de 8 clases", remainingClassAllowance: 3 },
        },
      }).lines,
    ).toEqual(always);
  });

  it("is blocked while a transfer Payment awaits review", () => {
    expect(
      describeAccountClosure({
        ...nothing,
        latestPayment: { method: "transfer", state: "pending" },
      }).blocked,
    ).toBe(true);
    expect(
      describeAccountClosure({
        ...nothing,
        latestPayment: { method: "transfer", state: "rejected" },
      }).blocked,
    ).toBe(false);
  });
});
