import { formatCivilDate } from "../home/home-format";
import { bookingRejectionMessage } from "./booking-rejection-copy";

/** Why a Booking or a waitlist entry was refused, from the API's problem body. */
export function problemMessage(body: unknown): string | null {
  if (typeof body !== "object" || body === null) return null;
  const code = (body as { code?: unknown }).code;
  const detail = (body as { detail?: unknown }).detail;
  if (code === "booking_during_freeze" && typeof detail === "string") {
    const date = /until (\d{4}-\d{2}-\d{2})$/.exec(detail)?.[1];
    if (date !== undefined) return `Tu plan está congelado hasta el ${formatCivilDate(date)}.`;
  }
  if (code === "booking_before_start_date" && typeof detail === "string") {
    const date = /: (\d{4}-\d{2}-\d{2})$/.exec(detail)?.[1];
    if (date !== undefined) return `Podrás reservar a partir del ${formatCivilDate(date)}.`;
  }
  return typeof code === "string" ? bookingRejectionMessage(code) : null;
}

/** C4 A: what Reservar takes, from the Subscription that covers the class. */
export function usesLine(
  covering: { remainingClassAllowance: number; extraClasses?: number } | null,
) {
  const classes = (covering?.remainingClassAllowance ?? 0) + (covering?.extraClasses ?? 0);
  if (classes === 1) return "Usarás tu última clase.";
  if (classes > 1) return `Usarás 1 de tus ${classes} clases.`;
  return "Se descuenta 1 clase de tu plan";
}
