import type { ClientSubscriptionDto } from "@pilates/api-contracts";
import { agendaDayChipLabel, boliviaCivilDate, formatStartTime } from "@pilates/mobile-core";

import { formatCivilDate } from "./home-format";

export type GuestPassCopy = {
  eyebrow?: string;
  title: string;
  note: string;
  /** What the card's one action does next. */
  next: "book" | "detail" | "purchase";
  /** Who invited her, on the unused pass (walkthrough n.º 19, C02f). */
  invitedBy?: { firstName: string; initials: string };
};

/**
 * Walkthrough n.º 56, 57 and 60: a Guest Pass reads as one free class, never
 * as a Plan with 0 classes left; once used, it names the class; and once she
 * has bought a Plan, that Plan takes its place. Inicio and Mi plan share these
 * lines. An expired pass is an ordinary expired Plan.
 */
export function guestPassCopy(
  view: Pick<ClientSubscriptionDto, "status" | "subscription" | "nextSubscription">,
): GuestPassCopy | null {
  const subscription = view.subscription;
  const pass = subscription?.guestPass;
  if (subscription == null || pass === undefined || view.status === "expired") return null;
  if (pass.usedClassStartsAt === null) {
    return {
      title: "Tu clase gratis de invitada",
      note: `Úsala antes del ${formatCivilDate(subscription.endsOn)}`,
      // C02f: the card books the free class straight away.
      next: "book",
      ...(pass.hostFirstName === undefined
        ? {}
        : {
            invitedBy: { firstName: pass.hostFirstName, initials: pass.hostInitials ?? "" },
          }),
    };
  }
  const next = view.nextSubscription;
  if (next != null) {
    return {
      eyebrow: `Tu plan · ${next.planName}`,
      title: `Empieza el ${formatCivilDate(next.startsOn)}`,
      note: "Tu clase de invitada ya se usó.",
      next: "detail",
    };
  }
  const { weekday, day } = agendaDayChipLabel(boliviaCivilDate(new Date(pass.usedClassStartsAt)));
  return {
    title: "Clase de invitada usada",
    note: `${weekday} ${day}, ${formatStartTime(pass.usedClassStartsAt)}`,
    next: "purchase",
  };
}
