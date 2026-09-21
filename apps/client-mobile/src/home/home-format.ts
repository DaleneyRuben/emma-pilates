import type { ClientSubscriptionDtoStatus } from "@pilates/api-contracts";

const civilDateFormatter = new Intl.DateTimeFormat("es-BO", {
  day: "numeric",
  month: "long",
  timeZone: "UTC",
});

const badgeCopy: Record<
  Exclude<ClientSubscriptionDtoStatus, "none">,
  string
> = {
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

export function describeAllowance(remaining: number, original: number): string {
  return `${remaining} de ${original} clases`;
}

export function subscriptionBadge(
  status: Exclude<ClientSubscriptionDtoStatus, "none">,
): string {
  return badgeCopy[status];
}
