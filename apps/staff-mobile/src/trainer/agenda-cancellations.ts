import type { SessionCancellationSummaryDto } from "@pilates/api-contracts";

import { countLabel } from "../ui/session-time";

// FIX-042 (decisiones §20.24): the cause a cancelled class shows on S02.
const causes: Record<SessionCancellationSummaryDto["cause"], string> = {
  minimum_not_met: "Cancelada · mínimo no alcanzado",
  studio: "Cancelada por el estudio",
  schedule_paused: "Serie en pausa",
};

export const causeLabel = (cause: SessionCancellationSummaryDto["cause"]): string => causes[cause];

/**
 * «Hoy · 3 clases · 1 cancelada», or «Hoy · 5 canceladas» when none stands:
 * S02 and, since FIX-052, the Staff Horario.
 */
export function agendaHeading(
  dayName: string,
  sessions: readonly { cancellation?: SessionCancellationSummaryDto | null }[],
): string {
  const cancelled = sessions.filter((session) => (session.cancellation ?? null) !== null).length;
  const standing = sessions.length - cancelled;
  const cancelledLabel = countLabel(cancelled, "cancelada", "canceladas");
  if (standing === 0) return `${dayName} · ${cancelledLabel}`;
  const standingLabel = countLabel(standing, "clase", "clases");
  return cancelled === 0
    ? `${dayName} · ${standingLabel}`
    : `${dayName} · ${standingLabel} · ${cancelledLabel}`;
}

const causeTails: Record<SessionCancellationSummaryDto["cause"], string> = {
  minimum_not_met: "por mínimo",
  schedule_paused: "en pausa",
  studio: "por el estudio",
};

/**
 * The tail of the folded line, «por mínimo» in «2 canceladas por mínimo»
 * (FIX-083, FIX-089); empty when the causes differ, so it reads «3 canceladas».
 */
export function cancelledReason(
  sessions: readonly { cancellation?: SessionCancellationSummaryDto | null }[],
): string {
  const causes = new Set(sessions.map((session) => session.cancellation?.cause));
  const [only] = [...causes];
  return causes.size === 1 && only !== undefined ? causeTails[only] : "";
}
