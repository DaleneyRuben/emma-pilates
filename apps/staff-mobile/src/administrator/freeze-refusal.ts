// E9 B (owner 2026-11-19): why a freeze is refused, as chips, plus an
// optional message. The API takes one `refusalReason` (≤ 300), stores it on the
// freeze (FIX-091) and sends it in the Client's «Congelamiento rechazado»
// notification.
export const refusalReasons = [
  "Faltan días de aviso",
  "Ya usó su congelamiento",
  "Otro motivo",
] as const;

export type RefusalReason = (typeof refusalReasons)[number];

const otherReason: RefusalReason = "Otro motivo";

export const refusalReasonLimit = 300;

/** Room left for her message after the chip and its «. ». */
export function refusalMessageLimit(reason: RefusalReason | null): number {
  return reason === null || reason === otherReason
    ? refusalReasonLimit
    : refusalReasonLimit - reason.length - 2;
}

/** With «Otro motivo» her message is the reason, so it must be written. */
export function refusalNeedsMessage(reason: RefusalReason | null): boolean {
  return reason === otherReason;
}

/**
 * «Faltan días de aviso. Necesitamos 48 h…», the chip alone, or only the
 * message with «Otro motivo»; undefined while nothing usable is chosen.
 */
export function refusalReasonText(
  reason: RefusalReason | null,
  message: string,
): string | undefined {
  if (reason === null) return undefined;
  // A message typed under «Otro motivo» may run longer than a chip leaves room for.
  const written = message.trim().slice(0, refusalMessageLimit(reason)).trim();
  if (reason === otherReason) return written === "" ? undefined : written;
  return written === "" ? reason : `${reason}. ${written}`;
}

/** Why «Rechazar y avisar a …» is not available yet. */
export function refusalDisabledReason(
  reason: RefusalReason | null,
  message: string,
  firstName: string,
): string | undefined {
  if (refusalReasonText(reason, message) !== undefined) return undefined;
  return reason === null ? "Elige un motivo." : `Escribe el motivo para ${firstName}.`;
}
