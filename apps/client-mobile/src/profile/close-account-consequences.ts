export type ClosureInputs = {
  bookings: { kind: "booking" | "waitlist" }[];
  evaluations: { state: "booked" | "cancelled" | "no_show" }[];
  latestPayment: { method: string; state: string } | null;
  subscription: {
    status: "active" | "expiring_soon" | "expired" | "none";
    subscription?: { planName: string; remainingClassAllowance: number } | null;
  };
};

export type ClosureDescription = { blocked: boolean; lines: string[] };

const alwaysLines = [
  "Cerramos tu sesión en todos tus dispositivos.",
  "Tu correo queda libre por si quieres registrarte de nuevo.",
];

const bookingPhrase = (count: number) =>
  count === 1 ? "tu reserva futura" : `tus ${count} reservas futuras`;

const evaluationPhrase = (count: number) =>
  count === 1
    ? "tu evaluación nutricional pendiente"
    : `tus ${count} evaluaciones nutricionales pendientes`;

const cancellationLine = (bookings: number, evaluations: number) => {
  const parts = [
    ...(bookings > 0 ? [bookingPhrase(bookings)] : []),
    ...(evaluations > 0 ? [evaluationPhrase(evaluations)] : []),
  ];
  return parts.length === 0 ? [] : [`Cancelamos ${parts.join(" y ")}. No se descuenta nada.`];
};

const planLine = (subscription: ClosureInputs["subscription"]): string[] => {
  const current = subscription.subscription;
  if (
    current == null ||
    (subscription.status !== "active" && subscription.status !== "expiring_soon")
  ) {
    return [];
  }
  const left = current.remainingClassAllowance;
  const forfeited =
    left === 0
      ? ""
      : left === 1
        ? " y pierdes la clase que te queda"
        : ` y pierdes las ${left} clases que te quedan`;
  return [`Tu plan ${current.planName} termina hoy. No se devuelve dinero${forfeited}.`];
};

// What BE-007 G3–G6 do to this Client, drawn from data the app already loads
// (prompt 24): only the lines that apply, then the two that always do.
export const describeAccountClosure = (inputs: ClosureInputs): ClosureDescription => {
  const bookings = inputs.bookings.filter(({ kind }) => kind === "booking").length;
  const waitlists = inputs.bookings.length - bookings;
  const evaluations = inputs.evaluations.filter(({ state }) => state === "booked").length;

  return {
    blocked:
      inputs.latestPayment?.method === "transfer" && inputs.latestPayment.state === "pending",
    lines: [
      ...cancellationLine(bookings, evaluations),
      ...(waitlists === 0
        ? []
        : [
            waitlists === 1
              ? "Sales de 1 lista de espera."
              : `Sales de ${waitlists} listas de espera.`,
          ]),
      ...planLine(inputs.subscription),
      ...alwaysLines,
    ],
  };
};
