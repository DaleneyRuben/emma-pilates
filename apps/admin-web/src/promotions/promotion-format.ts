import { formatListDate } from "@pilates/api-contracts";
import type { AdminPromotionDtoState } from "@pilates/api-contracts";
import { countFormat } from "../components/table/pagination";

// Follow-up 39 §3: the derived state on every card. An archived Promotion
// never reaches the list (delete archives it), so it has no pill here.
export const statePills: Record<
  Exclude<AdminPromotionDtoState, "archived">,
  { tone: "neutral" | "advertencia" | "exito" | "error"; label: string }
> = {
  draft: { tone: "neutral", label: "Borrador" },
  scheduled: { tone: "advertencia", label: "Programada" },
  active: { tone: "exito", label: "Activa" },
  ended: { tone: "error", label: "Finalizada" },
};

/**
 * "Del 01/10/2026 al 31/10/2026": the inclusive display window (AW17). A
 * draft may still lack either date (finding 82).
 */
export const formatDisplayWindow = (
  startsOn: string | null,
  endsOn: string | null,
): string => {
  if (startsOn !== null && endsOn !== null) {
    return `Del ${formatListDate(startsOn)} al ${formatListDate(endsOn)}`;
  }
  if (startsOn !== null) return `Desde el ${formatListDate(startsOn)}`;
  if (endsOn !== null) return `Hasta el ${formatListDate(endsOn)}`;
  return "Sin fechas todavía";
};

export const carouselSubtitle = (count: number): string =>
  count === 0
    ? "Ninguna promoción en el carrusel"
    : count === 1
      ? "1 promoción en el carrusel"
      : `${countFormat.format(count)} promociones · arrastra para cambiar el orden`;

/**
 * The private image routes answer `no-store`, but a browser still reuses an
 * image it already holds for the same URL inside one page; naming the asset
 * in the URL makes a replaced image a new URL (the route ignores the extra
 * parameter).
 */
export const imageUrlFor = (url: string, imageAssetId: string): string =>
  `${url}${url.includes("?") ? "&" : "?"}asset=${imageAssetId}`;
