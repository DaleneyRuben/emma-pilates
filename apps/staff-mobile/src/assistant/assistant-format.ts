import { isCompletePhone, phoneWithFlag } from "@pilates/mobile-core";

export function describeClasses(count: number): string {
  return count === 1 ? "1 clase" : `${count} clases`;
}

// Walkthrough finding 109: digits that fit no mobile read «Celular incompleto»,
// as the client file header does (finding 95).
export function describeContact(phone: string | null | undefined, email: string): string {
  if (!phone?.trim()) return email;
  return isCompletePhone(phone)
    ? `${phoneWithFlag(phone)} · ${email}`
    : `Celular incompleto · ${email}`;
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
