import type { ContactAlertItemDtoReasonsItem } from "@pilates/api-contracts";

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
  const withCountry = digits.startsWith("591") ? digits : `591${digits}`;
  return `https://wa.me/${withCountry}`;
};
