import type {
  AdministratorSessionAvailabilityDto,
  SessionCancellationSummaryDto,
} from "@pilates/api-contracts";
import { boliviaParts, formatLongDay } from "../lib/bolivia-time";

type Cause = SessionCancellationSummaryDto["cause"];

// FIX-042 (follow-ups 243–245, decisiones §20.24): a cancelled class stays
// in the Horario, muted, saying why. The block is narrow, so it carries a
// short form; the panel and screen readers get the whole cause.
const causes: Record<Cause, { label: string; short: string }> = {
  minimum_not_met: {
    label: "Cancelada · mínimo no alcanzado",
    short: "Cancelada · mínimo",
  },
  studio: { label: "Cancelada por el estudio", short: "Cancelada · estudio" },
  schedule_paused: { label: "Serie en pausa", short: "Serie en pausa" },
};

export const cancellationOf = (
  session: AdministratorSessionAvailabilityDto,
): SessionCancellationSummaryDto | null => session.cancellation ?? null;

export const causeLabel = (cause: Cause): string => causes[cause].label;

export const causeShortLabel = (cause: Cause): string => causes[cause].short;

/** The sentence the read-only panel opens with. */
export function cancellationNote(
  cancellation: SessionCancellationSummaryDto,
): string {
  const moment = boliviaParts(cancellation.cancelledAt);
  const when = `el ${formatLongDay(moment.date)} a las ${moment.time}`;
  switch (cancellation.cause) {
    case "minimum_not_met":
      return `Se canceló sola ${when}: no llegó al mínimo de reservas. Las clientas que reservaron recuperaron su clase.`;
    case "studio":
      return `La canceló el estudio ${when}. Las clientas que reservaron recuperaron su clase y les llegó un aviso.`;
    case "schedule_paused":
      return "Esta clase no se publica: su serie está en pausa.";
  }
}
