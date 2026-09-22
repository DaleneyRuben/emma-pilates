const civilDateFormatter = new Intl.DateTimeFormat("es-BO", {
  day: "numeric",
  month: "long",
  timeZone: "UTC",
  year: "numeric",
});

const instantDateFormatter = new Intl.DateTimeFormat("es-BO", {
  day: "numeric",
  month: "long",
  timeZone: "America/La_Paz",
  year: "numeric",
});

// A civil date (YYYY-MM-DD) such as a Subscription's paid-through day.
export function formatCivilDate(civilDate: string): string {
  return civilDateFormatter.format(new Date(`${civilDate}T12:00:00.000Z`));
}

// An instant rendered as the Bolivia calendar day it falls on.
export function formatInstantDate(instant: string): string {
  return instantDateFormatter.format(new Date(instant));
}

export function describeClasses(count: number): string {
  return count === 1 ? "1 clase" : `${count} clases`;
}

export function describeContact(
  phone: string | null | undefined,
  email: string,
): string {
  return phone ? `${phone} · ${email}` : email;
}
