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

// AW36's «Reglas fijas»: the Studio Settings only a release changes.
export const fixedRules = (settings: StudioSettingsDto) => [
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
  {
    label: "Evaluación nutricional pagada",
    value: `${formatBolivianos(settings.evaluationPriceCentavos)} · ${formatBolivianos(settings.nutritionistFeeCentavos)} para la nutricionista`,
  },
];

export const versionLine = (settings: StudioSettingsDto): string =>
  settings.updatedByName === null
    ? `Versión ${settings.version} · valores iniciales`
    : `Versión ${settings.version} · guardada el ${formatCivilDate(
        boliviaParts(settings.updatedAt).date,
      )} por ${settings.updatedByName}`;
