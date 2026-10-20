import type { AdminPromotionContactDto } from "@pilates/api-contracts";
import {
  boliviaParts,
  boliviaToday,
  formatCivilDate,
} from "../../lib/bolivia-time";

/** The day a contact agreed, `dd/mm/aaaa` in Bolivia (AW35). */
export const consentDate = (contact: AdminPromotionContactDto): string =>
  formatCivilDate(boliviaParts(contact.consentedAt).date);

// A spreadsheet runs a cell that starts with = + - @ as a formula; a phone
// number such as «+591 70011005» stays as typed.
const neutralised = (value: string): string =>
  /^[=@\t\r]/.test(value) || /^[+-](?![\d\s]+$)/.test(value)
    ? `'${value}`
    : value;

const cell = (value: string): string => {
  const safe = neutralised(value);
  return /[",\r\n]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe;
};

/**
 * AW35's «Exportar CSV»: the table's columns, CRLF rows, and a byte-order
 * mark so a spreadsheet reads the accents as UTF-8.
 */
export const promotionContactsCsv = (
  contacts: readonly AdminPromotionContactDto[],
): string =>
  `\uFEFF${[
    ["Nombre", "Correo", "Teléfono", "Aceptó el"],
    ...contacts.map((contact) => [
      contact.name,
      contact.email,
      contact.phone ?? "",
      consentDate(contact),
    ]),
  ]
    .map((row) => `${row.map(cell).join(",")}\r\n`)
    .join("")}`;

export const contactsCsvName = (now: Date): string =>
  `contactos-promociones-${boliviaToday(now)}.csv`;
