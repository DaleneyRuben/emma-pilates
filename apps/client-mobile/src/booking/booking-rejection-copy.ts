// MOB-070: a business rejection is named by its stable problem code, never by
// the human-readable detail. The weekly cap (BKM-007) answers
// weekly_cap_reached; a Booking before the Start Date (BKM-006) answers
// booking_before_start_date.
const bookingRejections: Record<string, string> = {
  booking_cancellation_window:
    "Ya no se puede cancelar: falta menos que la ventana de cancelación.",
  reschedule_outside_window: "Solo puedes reprogramar dentro de la ventana de cancelación.",
  reschedule_target_ineligible: "Esa clase no está disponible para reprogramar.",
  session_full: "La clase ya no tiene cupos.",
  weekly_cap_reached: "Ya usaste tus clases de esta semana.",
  booking_before_start_date:
    "Tu plan todavía no empieza: podrás reservar desde su fecha de inicio.",
};

export function bookingRejectionMessage(code: string | undefined): string | null {
  return code === undefined ? null : (bookingRejections[code] ?? null);
}

export function problemCode(body: unknown): string | undefined {
  if (typeof body !== "object" || body === null) return undefined;
  const code = (body as { code?: unknown }).code;
  return typeof code === "string" ? code : undefined;
}
