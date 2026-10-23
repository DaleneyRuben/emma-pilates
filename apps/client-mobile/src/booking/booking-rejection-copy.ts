// MOB-070: a business rejection is named by its stable problem code, never by
// the human-readable detail. weekly_class_cap_reached arrives with BKM-007
// and subscription_not_started with BKM-006; both are mapped now so the
// screen can show them the day the API starts answering them.
const bookingRejections: Record<string, string> = {
  booking_cancellation_window:
    "Ya no se puede cancelar: falta menos que la ventana de cancelación.",
  reschedule_outside_window: "Solo puedes reprogramar dentro de la ventana de cancelación.",
  reschedule_target_ineligible: "Esa clase no está disponible para reprogramar.",
  session_full: "La clase ya no tiene cupos.",
  weekly_class_cap_reached: "Ya alcanzaste el máximo de clases de esta semana.",
  subscription_not_started: "Tu plan todavía no empieza: podrás reservar desde su fecha de inicio.",
};

export function bookingRejectionMessage(code: string | undefined): string | null {
  return code === undefined ? null : (bookingRejections[code] ?? null);
}

export function problemCode(body: unknown): string | undefined {
  if (typeof body !== "object" || body === null) return undefined;
  const code = (body as { code?: unknown }).code;
  return typeof code === "string" ? code : undefined;
}
