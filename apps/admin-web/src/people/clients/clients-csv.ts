import type {
  AdminClientExportRowDto,
  AdminPromotionContactDto,
} from "@pilates/api-contracts";
import {
  boliviaParts,
  boliviaToday,
  formatCivilDate,
} from "../../lib/bolivia-time";
import { csvDocument } from "../../lib/csv";
import type { ClientFilter } from "../people-search";

// FIX-065 (walkthrough finding 91): Clientas › «Exportar CSV», the columns
// the owner asked for.
const header = ["Nombre", "Estado", "Correo", "Teléfono", "Desde"];

/** FIX-091 (W8 A): the list's «Última clase», for the live Clients only. */
const clientsHeader = [...header, "Última clase"];

/** The row's «Estado» pill, as the table says it. */
const stateLabel: Record<
  AdminClientExportRowDto["subscriptionStatus"],
  string
> = {
  active: "Activo",
  expired: "Expirado",
  none: "Sin plan",
};

/**
 * «Desde» of a closed account, `dd/mm/aaaa` in Bolivia: the day she asked to
 * keep hearing from the studio.
 */
export const sinceDate = (contact: AdminPromotionContactDto): string =>
  formatCivilDate(
    // A backend before FIX-060 (a rollback) sends only «consentedAt».
    boliviaParts((contact.since as string | undefined) ?? contact.consentedAt)
      .date,
  );

export const clientsCsv = (rows: readonly AdminClientExportRowDto[]): string =>
  csvDocument([
    clientsHeader,
    ...rows.map((row) => [
      row.name,
      stateLabel[row.subscriptionStatus],
      row.email,
      row.phone ?? "",
      formatCivilDate(row.clientSince),
      row.lastClassOn == null ? "" : formatCivilDate(row.lastClassOn),
    ]),
  ]);

export const closedAccountsCsv = (
  contacts: readonly AdminPromotionContactDto[],
): string =>
  csvDocument([
    header,
    ...contacts.map((contact) => [
      contact.name,
      "Cuenta cerrada",
      contact.email,
      contact.phone ?? "",
      sinceDate(contact),
    ]),
  ]);

const fileSlug: Record<ClientFilter | "all", string> = {
  all: "todas",
  active: "con-plan",
  none: "sin-plan",
  expired: "expirado",
  founder: "fundadora",
  expiring: "por-vencer",
  unbooked: "sin-reservar",
  closed: "cuenta-cerrada",
};

/** The file says which chip it holds and the Bolivia day of the export. */
export const clientsCsvName = (
  filter: ClientFilter | undefined,
  now: Date,
): string => `clientas-${fileSlug[filter ?? "all"]}-${boliviaToday(now)}.csv`;
