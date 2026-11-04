import type { StudioSettingsDto } from "@pilates/api-contracts";
import { boliviaParts, formatCivilDate } from "../lib/bolivia-time";
import { formatBolivianos } from "../lib/money";

// The Cancellation Window as the apps write it: «2 h 30», «3 h», «45 min».
// The mobile apps have the same formatter in @pilates/mobile-core, which the
// admin web may not depend on.
export function formatCancellationWindow(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest} min`;
  return rest === 0
    ? `${hours} h`
    : `${hours} h ${String(rest).padStart(2, "0")}`;
}

const count = (value: number, singular: string, plural: string) =>
  `${value} ${value === 1 ? singular : plural}`;

type Rule = { label: string; value: string };

// The Paid Evaluation's price and fee, which the Coordinator reads as null
// (ADR-0108): no row then.
const evaluationRule = (settings: StudioSettingsDto): Rule[] =>
  settings.evaluationPriceCentavos === null ||
  settings.nutritionistFeeCentavos === null
    ? []
    : [
        {
          label: "Evaluación nutricional pagada",
          value: `${formatBolivianos(settings.evaluationPriceCentavos)} · ${formatBolivianos(settings.nutritionistFeeCentavos)} para la nutricionista`,
        },
      ];

// AW36's «Reglas fijas»: the Studio Settings only a release changes.
export const fixedRules = (settings: StudioSettingsDto): Rule[] => [
  {
    label: "Ventana de cancelación",
    value: `${formatCancellationWindow(settings.cancellationWindowMinutes)} antes de cada clase`,
  },
  {
    label: "Revisión del mínimo de reservas",
    value: `${formatCancellationWindow(settings.minimumBookingsCheckLeadMinutes)} antes de cada clase`,
  },
  {
    label: "Fecha de inicio de un plan",
    value: `Hasta ${count(settings.startDateLimitDays, "día", "días")} después de la compra`,
  },
  {
    label: "Membresía fundadora",
    value: `${settings.founderPlaces} lugares · ${settings.founderDiscountPercent} % de descuento · se pierde con más de ${count(settings.founderGapDays, "día", "días")} sin plan`,
  },
  {
    label: "Invita a una amiga",
    value: `${count(settings.guestPassesPerClient, "clase de invitada", "clases de invitada")} por persona · ${count(settings.invitesPerHostPerMonth, "invitación", "invitaciones")} al mes · +${count(settings.inviteRewardClasses, "clase", "clases")} cuando la amiga compra`,
  },
  ...evaluationRule(settings),
];

// The configurable rules as the Coordinator reads them, without the form
// (ADR-0108): the Administrator alone saves them.
export const configurableRules = (settings: StudioSettingsDto): Rule[] => [
  {
    label: "Mínimo de reservas por clase",
    value: count(settings.minimumBookings, "reserva", "reservas"),
  },
  {
    label: "Días adelante que una clienta puede reservar",
    value: count(settings.bookingWindowDays, "día", "días"),
  },
  {
    label: "Impuestos sobre las ventas",
    value: `${settings.taxRatePercent} %`,
  },
  {
    label: "Meta de renovación de la coordinadora",
    value: `${settings.renewalTargetMonths1To6Percent} % en los meses 1 a 6 · ${settings.renewalTargetMonths7To12Percent} % en los meses 7 a 12 · ${settings.renewalTargetFromMonth13Percent} % desde el mes 13`,
  },
  {
    label: "Fecha de apertura",
    value:
      settings.openingDate === null
        ? "Todavía sin fecha"
        : formatCivilDate(settings.openingDate),
  },
];

export const versionLine = (settings: StudioSettingsDto): string =>
  settings.updatedByName === null
    ? `Versión ${settings.version} · valores iniciales`
    : `Versión ${settings.version} · guardada el ${formatCivilDate(
        boliviaParts(settings.updatedAt).date,
      )} por ${settings.updatedByName}`;
