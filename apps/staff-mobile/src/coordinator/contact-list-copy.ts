import type { ContactAlertItemDto, ContactAlertItemDtoReasonsItem } from "@pilates/api-contracts";
import { isCompletePhone, phoneWithFlag } from "@pilates/mobile-core";

export const contactAlertReasons: Record<ContactAlertItemDtoReasonsItem, string> = {
  no_booking_7_days: "7 días sin reservar",
  fewer_than_2_classes_by_day_15: "Menos de 2 clases a los 15 días",
  fewer_than_4_classes_in_first_30_days: "Menos de 4 clases en su primer mes",
};

const startedOnFormatter = new Intl.DateTimeFormat("es-BO", {
  day: "numeric",
  month: "long",
  timeZone: "UTC",
});

export const startedOnLabel = (civilDate: string): string =>
  `Empezó el ${startedOnFormatter.format(new Date(`${civilDate}T12:00:00.000Z`))}`;

export const whatsAppHref = (phone: string): string | null => {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 0) return null;
  // FIX-037: a stored «+<code> <digits>» keeps its own country.
  const withCountry =
    phone.trim().startsWith("+") || digits.startsWith("591") ? digits : `591${digits}`;
  return `https://wa.me/${withCountry}`;
};

// Walkthrough finding 109: the Para contactar card names an unusable phone, as
// the client file does (finding 95), and does not open WhatsApp to it.
export const contactPhoneLabel = (phone: string | null): string => {
  if (phone === null || phone.trim() === "") return "Sin teléfono";
  return isCompletePhone(phone) ? phoneWithFlag(phone) : "Celular incompleto";
};

export const contactWhatsAppHref = (phone: string | null): string | null =>
  phone !== null && isCompletePhone(phone) ? whatsAppHref(phone) : null;

// Walkthrough finding 113: stubs until the calm list lands.
export const contactReasonLine = (reasons: readonly ContactAlertItemDtoReasonsItem[]): string =>
  reasons.join(" ");

export const contactRowMeta = (item: ContactAlertItemDto): string => item.name;

export const contactMissingPhoneNote = (phone: string | null): string => phone ?? "";

export const sortContactAlerts = (items: readonly ContactAlertItemDto[]): ContactAlertItemDto[] => [
  ...items,
];
