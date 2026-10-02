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

// S06 «Reenvío limitado»: the recipient lane is full; the current link still works.
export const limitedEmailMessage =
  "Ya enviamos un correo a esa dirección hace poco. El enlace vigente sigue sirviendo.";

// Follow-up 78: the signed-in staff Account's own email budget is full (BE-013).
export const accountEmailLimitCode = "staff_email_throttled";
export const accountEmailLimitMessage =
  "Enviaste muchos correos en poco tiempo. Espera un momento para enviar otro; los enlaces que ya enviaste siguen sirviendo.";

/** The re-send notice for whichever email lane is full, as S06's cards draw it. */
export const resendLimitNotice = (accountLimited: boolean) =>
  accountLimited
    ? { message: accountEmailLimitMessage, waitLabel: "Podrás enviarlo en" }
    : { message: limitedEmailMessage, waitLabel: "Podrás reenviarlo en" };
