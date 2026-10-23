import type { AdminPromotionContactDto } from "@pilates/api-contracts";
import {
  boliviaParts,
  boliviaToday,
  formatCivilDate,
} from "../../lib/bolivia-time";
import { toCsv } from "../../lib/csv";

/** AW35's «Tipo»: a live Client, or a former Client (follow-up 104). */
export const kindLabel = (contact: AdminPromotionContactDto): string =>
  contact.kind === "client" ? "Activa" : "Cuenta cerrada";

/** The day a contact agreed, `dd/mm/aaaa` in Bolivia (AW35). */
export const consentDate = (contact: AdminPromotionContactDto): string =>
  formatCivilDate(boliviaParts(contact.consentedAt).date);

/**
 * AW35's «Exportar CSV»: the table's columns.
 */
export const promotionContactsCsv = (
  contacts: readonly AdminPromotionContactDto[],
): string =>
  toCsv([
    ["Nombre", "Tipo", "Correo", "Teléfono", "Aceptó el"],
    ...contacts.map((contact) => [
      contact.name,
      kindLabel(contact),
      contact.email,
      contact.phone ?? "",
      consentDate(contact),
    ]),
  ]);

export const contactsCsvName = (now: Date): string =>
  `contactos-promociones-${boliviaToday(now)}.csv`;
