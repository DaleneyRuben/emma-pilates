import { isApiError } from "../api/problem";

// WEB-039: why the backend refused to book a Client from Horario, by its
// stable code (the booking commands' problems), naming the Client.
const problems: Record<string, (name: string) => string> = {
  session_full: () =>
    "La clase se llenó mientras elegías. Vuelve y agrégala a la lista de espera.",
  session_has_capacity: () =>
    "Se liberó un lugar. Vuelve y resérvala directamente.",
  no_eligible_subscription: (name) =>
    `${name} no tiene un plan activo con clases para esta fecha.`,
  weekly_cap_reached: (name) => `${name} ya usó sus clases de esta semana.`,
  booking_overlap: (name) => `${name} ya tiene otra clase a esa hora.`,
  active_booking_exists: (name) => `${name} ya está reservada en esta clase.`,
  active_waitlist_entry_exists: (name) =>
    `${name} ya está en la lista de espera de esta clase.`,
  booking_window_exceeded: () => "Esta clase todavía no abre para reservas.",
  booking_during_freeze: (name) =>
    `${name} tiene su plan congelado en esa fecha.`,
  booking_before_start_date: (name) =>
    `El plan de ${name} empieza después de esta clase.`,
  session_not_found: () =>
    "Esta sesión ya no existe. Cierra el panel y actualiza el horario.",
  booking_access_denied: () =>
    "No tienes permiso para reservar por una clienta.",
};

export function bookingProblem(error: unknown, clientName: string): string {
  if (isApiError(error)) {
    const known = problems[error.code];
    if (known !== undefined) return known(clientName);
  }
  return "No pudimos reservar. Inténtalo de nuevo.";
}
