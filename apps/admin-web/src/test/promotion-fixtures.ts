import type { AdminPromotionDto } from "@pilates/api-contracts";
import { http } from "msw";
import { apiUrl, jsonResponse } from "./msw";

export const promotionsPath = "/api/v1/administrator/promotions";

export const promotionRow = (
  suffix: string,
  headline: string,
  extra: Partial<AdminPromotionDto> = {},
): AdminPromotionDto => {
  const id = `6a000000-0000-5000-8000-0000000000${suffix}`;
  return {
    id,
    headline,
    description: "Una novedad del estudio para todas las clientas.",
    displayStartsOn: "2026-10-01",
    displayEndsOn: "2026-10-31",
    displayOrder: Number(suffix),
    publishedAt: null,
    state: "draft",
    image: {
      imageAssetId: `1b000000-0000-5000-8000-0000000000${suffix}`,
      width: 1600,
      height: 900,
      thumbnailUrl: `${promotionsPath}/${id}/image?variant=promotion_480`,
    },
    updatedAt: "2026-09-24T12:00:00.000Z",
    ...extra,
  };
};

// The carousel order the fixtures answer: a published one showing today, a
// scheduled one, a draft without an image, and one whose window ended.
export const reformer = promotionRow("01", "Nueva sala de Reformer en Urubó", {
  state: "active",
  publishedAt: "2026-09-20T12:00:00.000Z",
  displayStartsOn: "2026-09-01",
  displayEndsOn: "2026-10-31",
});
export const barre = promotionRow("02", "Clases de Barre los sábados", {
  state: "scheduled",
  publishedAt: "2026-09-22T12:00:00.000Z",
  displayStartsOn: "2026-10-05",
  displayEndsOn: "2026-11-20",
});
export const horario = promotionRow("03", "Horario de fin de año", {
  image: null,
});
export const verano = promotionRow("04", "Semana de puertas abiertas", {
  state: "ended",
  publishedAt: "2026-08-01T12:00:00.000Z",
  displayStartsOn: "2026-08-01",
  displayEndsOn: "2026-08-31",
});

export const promotionListHandler = (
  respond: () => Response | Promise<Response>,
) => http.get(apiUrl(promotionsPath), () => respond());

export const promotionList = (items: AdminPromotionDto[]) =>
  promotionListHandler(() => jsonResponse(items));
