import {
  formatListDate,
  type ContactAlertItemDto,
  type ContactAlertItemDtoReasonsItem,
} from "@pilates/api-contracts";
import { isCompletePhone, phoneWithFlag } from "@pilates/mobile-core";

export const contactAlertReasons: Record<ContactAlertItemDtoReasonsItem, string> = {
  no_booking_7_days: "7 días sin reservar",
  fewer_than_2_classes_by_day_15: "Menos de 2 clases a los 15 días",
  fewer_than_4_classes_in_first_30_days: "Menos de 4 clases en su primer mes",
};

export const startedOnLabel = (civilDate: string): string =>
  `Empezó el ${formatListDate(civilDate)}`;

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

const lowerFirst = (text: string): string => `${text.charAt(0).toLowerCase()}${text.slice(1)}`;

// The order the reasons read in, whatever order the API sends them.
const reasonOrder = Object.keys(contactAlertReasons) as ContactAlertItemDtoReasonsItem[];

const orderedReasons = (
  reasons: readonly ContactAlertItemDtoReasonsItem[],
): ContactAlertItemDtoReasonsItem[] => reasonOrder.filter((reason) => reasons.includes(reason));

/** Walkthrough finding 113: her reasons as words, for the sheet's list. */
export const contactReasonLabels = (reasons: readonly ContactAlertItemDtoReasonsItem[]): string[] =>
  orderedReasons(reasons).map((reason) => contactAlertReasons[reason]);

/** Walkthrough finding 113: S28's reasons as one plain line instead of chips. */
export const contactReasonLine = (reasons: readonly ContactAlertItemDtoReasonsItem[]): string =>
  contactReasonLabels(reasons)
    .map((label, index) => (index === 0 ? label : lowerFirst(label)))
    .join(" · ");

/** The row's quiet line: her start, led by what is wrong with her phone. */
export const contactRowMeta = (item: ContactAlertItemDto): string => {
  const started = startedOnLabel(item.startedOn);
  return contactWhatsAppHref(item.phone) === null
    ? `${contactPhoneLabel(item.phone)} · ${lowerFirst(started)}`
    : started;
};

/** The sheet's line under her name: her phone (or what is wrong with it) and her start. */
export const contactSheetMeta = (item: ContactAlertItemDto): string =>
  `${contactPhoneLabel(item.phone)} · ${lowerFirst(startedOnLabel(item.startedOn))}`;

/** Why the sheet has no WhatsApp button for her. */
export const contactMissingPhoneNote = (phone: string | null): string => {
  const what =
    phone === null || phone.trim() === ""
      ? "No tiene teléfono registrado"
      : `Su celular está incompleto (${phone.trim()})`;
  return `${what}, así que no se puede abrir WhatsApp. Háblale en el estudio o revisa su ficha.`;
};

/** More reasons first, then whoever started earliest, then by name. */
export const sortContactAlerts = (items: readonly ContactAlertItemDto[]): ContactAlertItemDto[] =>
  [...items].sort(
    (a, b) =>
      b.reasons.length - a.reasons.length ||
      a.startedOn.localeCompare(b.startedOn) ||
      a.name.localeCompare(b.name, "es"),
  );
