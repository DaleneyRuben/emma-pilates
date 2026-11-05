import type { ContactAlertItemDtoReasonsItem } from "@pilates/api-contracts";

export const contactAlertReasons: Record<
  ContactAlertItemDtoReasonsItem,
  string
> = {
  no_booking_7_days: "7 días sin reservar",
  fewer_than_2_classes_by_day_15: "Menos de 2 clases a los 15 días",
  fewer_than_4_classes_in_first_30_days: "Menos de 4 clases en su primer mes",
};

export const startedOnLabel = (civilDate: string): string => {
  const [year, month, day] = civilDate.split("-");
  if (year === undefined || month === undefined || day === undefined) {
    return civilDate;
  }
  return `${day}/${month}/${year}`;
};

// wa.me takes the digits alone, code first. FIX-037: a stored «+<code>
// <digits>» already carries its country (any country); an older number
// without one is Bolivian.
export const whatsAppHref = (phone: string): string | null => {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 0) return null;
  const withCountry =
    phone.trim().startsWith("+") || digits.startsWith("591")
      ? digits
      : `591${digits}`;
  return `https://wa.me/${withCountry}`;
};

export const clientas = (count: number): string =>
  `${count} ${count === 1 ? "clienta" : "clientas"}`;
