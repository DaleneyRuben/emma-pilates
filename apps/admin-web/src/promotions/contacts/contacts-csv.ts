import type { AdminPromotionContactDto } from "@pilates/api-contracts";
import {
  boliviaParts,
  boliviaToday,
  formatCivilDate,
} from "../../lib/bolivia-time";
import { csvDocument } from "../../lib/csv";

/** AW35's «Tipo»: a live Client, or a former Client (follow-up 104). */
export const kindLabel = (contact: AdminPromotionContactDto): string =>
  contact.kind === "client" ? "Activa" : "Cuenta cerrada";

/**
 * AW35's «Desde», `dd/mm/aaaa` in Bolivia: the day a live Client joined, or
 * the day a former Client asked to keep hearing from the studio (FIX-060).
 */
export const sinceDate = (contact: AdminPromotionContactDto): string =>
  formatCivilDate(boliviaParts(contact.since).date);

/** AW35's «Exportar CSV»: the table's columns. */
export const promotionContactsCsv = (
  contacts: readonly AdminPromotionContactDto[],
): string =>
  csvDocument([
    ["Nombre", "Tipo", "Correo", "Teléfono", "Desde"],
    ...contacts.map((contact) => [
      contact.name,
      kindLabel(contact),
      contact.email,
      contact.phone ?? "",
      sinceDate(contact),
    ]),
  ]);

export const contactsCsvName = (now: Date): string =>
  `contactos-promociones-${boliviaToday(now)}.csv`;
