import type { ClientSubscriptionDtoStatus } from "@pilates/api-contracts";

const civilDateFormatter = new Intl.DateTimeFormat("es-BO", {
  day: "numeric",
  month: "long",
  timeZone: "UTC",
});

const badgeCopy: Record<Exclude<ClientSubscriptionDtoStatus, "none">, string> = {
  active: "Activa",
  expiring_soon: "Por vencer",
  expired: "Vencida",
};

export function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? "";
}

export function formatCivilDate(civilDate: string): string {
  return civilDateFormatter.format(new Date(`${civilDate}T00:00:00.000Z`));
}

const civilDateWithYearFormatter = new Intl.DateTimeFormat("es-BO", {
  day: "numeric",
  month: "long",
  timeZone: "UTC",
  year: "numeric",
});

// "25 de agosto de 2026", as Mi plan (Client 12) writes its dates.
export function formatCivilDateWithYear(civilDate: string): string {
  return civilDateWithYearFormatter.format(new Date(`${civilDate}T00:00:00.000Z`));
}

const dayMonthFormatter = new Intl.DateTimeFormat("es-BO", {
  day: "numeric",
  month: "long",
  timeZone: "America/La_Paz",
});

export function evaluationShortcut(nextStartsAt: string | undefined): string {
  return nextStartsAt === undefined
    ? "Agenda tu cita del mes"
    : `Próxima: ${dayMonthFormatter.format(new Date(nextStartsAt))}`;
}

// BKM-014: the reward is one class, not credit. The count still names the tile.
export function referralShortcut(count: number | undefined): string {
  if (count === undefined || count === 0) return "Invita a una amiga a una clase gratis";
  return count === 1 ? "1 amiga invitada" : `${count} amigas invitadas`;
}

export function describeAllowance(remaining: number, original: number): string {
  return `${remaining} de ${original} clases`;
}

export function subscriptionBadge(status: Exclude<ClientSubscriptionDtoStatus, "none">): string {
  return badgeCopy[status];
}
