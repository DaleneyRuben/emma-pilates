import type { ClientSubscriptionSummaryDto } from "@pilates/api-contracts";
import { agendaDayChipLabel, boliviaCivilDate, formatStartTime } from "@pilates/mobile-core";

import { formatCivilDate } from "./home-format";

/**
 * Walkthrough n.º 56 and 57: a Guest Pass reads as one free class, never as a
 * Plan with 0 classes left. Inicio and Mi plan share these lines.
 */
export function guestPassCopy(
  subscription: Pick<ClientSubscriptionSummaryDto, "endsOn" | "guestPass">,
): { title: string; note: string; used: boolean } | null {
  const pass = subscription.guestPass;
  if (pass === undefined) return null;
  if (pass.usedClassStartsAt === null) {
    return {
      title: "Tu clase gratis de invitada",
      note: `Úsala antes del ${formatCivilDate(subscription.endsOn)}`,
      used: false,
    };
  }
  const { weekday, day } = agendaDayChipLabel(boliviaCivilDate(new Date(pass.usedClassStartsAt)));
  return {
    title: "Clase de invitada usada",
    note: `${weekday} ${day}, ${formatStartTime(pass.usedClassStartsAt)}`,
    used: true,
  };
}
