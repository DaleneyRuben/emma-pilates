import { isApiError } from "../api/problem";

export type DecisionProblem =
  /** Someone decided first, or the Client already holds an active Plan. */
  | { kind: "conflict" }
  | { kind: "reason"; message: string }
  | { kind: "message"; message: string };

const messages: Record<string, string> = {
  booking_access_denied: "No tienes permiso para decidir pagos.",
  administration_access_denied: "No tienes permiso para decidir pagos.",
  payment_not_found:
    "Este pago ya no existe. Cierra el panel y vuelve a abrir la lista.",
  start_date_before_booked_class:
    "No se puede confirmar: la clienta tiene una clase reservada con su acceso actual el día de inicio o después. Cancela esa clase o espera a que pase, y vuelve a confirmar.",
};

// The confirm and reject refusals (PAY-002, STAFF-001) by their stable
// code (ADR-0021), never by the problem's text.
export function decisionProblem(error: unknown): DecisionProblem {
  if (isApiError(error)) {
    if (
      error.code === "payment_confirmation_conflict" ||
      error.code === "payment_not_pending"
    ) {
      return { kind: "conflict" };
    }
    if (error.code === "invalid_request") {
      return {
        kind: "reason",
        message: "Escribe un motivo de 1 a 300 caracteres.",
      };
    }
    const message = messages[error.code];
    if (message !== undefined) return { kind: "message", message };
  }
  return {
    kind: "message",
    message: "No pudimos registrar la decisión. Inténtalo de nuevo.",
  };
}

export const activePlanRefusal =
  "No se puede confirmar: la clienta ya tiene un plan activo. Si el pago no corresponde, recházalo con el motivo.";
