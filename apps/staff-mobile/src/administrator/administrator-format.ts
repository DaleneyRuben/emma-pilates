const dayMonthFormatter = new Intl.DateTimeFormat("es-BO", {
  day: "numeric",
  month: "long",
  timeZone: "America/La_Paz",
});
const clockFormatter = new Intl.DateTimeFormat("es-BO", {
  hour: "2-digit",
  hour12: false,
  minute: "2-digit",
  timeZone: "America/La_Paz",
});

export function formatSubmittedAt(instant: string): string {
  const date = new Date(instant);
  return `${dayMonthFormatter.format(date)}, ${clockFormatter.format(date)}`;
}

export function describeCount(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

// S14: the cancellation, the refund even inside the Cancellation Window, and
// who is told, with the Session's live counts.
export function describeSessionCancellation({
  bookedCount,
  waitlistCount,
}: {
  bookedCount: number;
  waitlistCount: number;
}): string {
  if (bookedCount === 0) return "Se cancelará esta clase. No tiene reservas.";

  const bookings =
    bookedCount === 1
      ? "Se cancelará la única reserva de esta clase, se reembolsará la clase al cliente afectado — incluso si ya no podía cancelar por su cuenta — y se le notificará."
      : `Se cancelarán las ${bookedCount} reservas de esta clase, se reembolsará una clase a cada cliente afectado — incluso si ya no podían cancelar por su cuenta — y se les notificará.`;
  if (waitlistCount === 0) return bookings;

  const waitlist =
    waitlistCount === 1
      ? "También se notificará a la persona en lista de espera."
      : `También se notificará a las ${waitlistCount} en lista de espera.`;
  return `${bookings} ${waitlist}`;
}
