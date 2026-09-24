import type { AdminPromotionDto } from "@pilates/api-contracts";
import { GripVertical, Image } from "lucide-react";
import { StatusPill } from "../components/ui/status-pill";
import { formatDisplayWindow, statePills } from "./promotion-format";

/**
 * AW17 card (design/README.md → Drag to reorder): a six-dot handle on the
 * left edge, the carousel position in a 26 px badge, the 16:9 thumbnail
 * first (read from the private route with the session cookie, never
 * cached), the headline and window, and the derived state (follow-up 39).
 */
export function PromotionCard({
  promotion,
  position,
  onOpen,
}: {
  promotion: AdminPromotionDto;
  position: number;
  onOpen: () => void;
}) {
  const pill =
    promotion.state === "archived" ? undefined : statePills[promotion.state];

  return (
    <article
      aria-label={promotion.headline}
      onClick={onOpen}
      className="flex cursor-pointer items-center gap-3 rounded-tarjeta border border-borde bg-blanco py-3 pr-4 pl-1 transition-shadow hover:shadow-tarjeta-hover"
    >
      <button
        type="button"
        aria-label={`Mover ${promotion.headline}`}
        onClick={(event) => event.stopPropagation()}
        className="flex h-10 w-7 shrink-0 cursor-grab touch-none items-center justify-center rounded-control text-texto-muy-tenue hover:bg-hover-fila hover:text-texto-tenue focus-visible:shadow-foco active:cursor-grabbing"
      >
        <GripVertical size={18} strokeWidth={1.6} aria-hidden="true" />
      </button>
      <span className="inline-flex size-[26px] shrink-0 items-center justify-center rounded-full bg-primario-tinte text-ayuda font-medium text-primario-profundo tabular">
        <span className="sr-only">Posición {position}</span>
        <span aria-hidden="true">{position}</span>
      </span>
      {promotion.image === null || promotion.image === undefined ? (
        <span className="flex aspect-video w-[120px] shrink-0 flex-col items-center justify-center gap-0.5 rounded-control bg-primario-tinte text-primario-profundo max-md:w-[88px]">
          <Image size={18} strokeWidth={1.5} aria-hidden="true" />
          <span className="text-[10px]">Sin imagen</span>
        </span>
      ) : (
        <img
          src={promotion.image.thumbnailUrl}
          alt=""
          width={120}
          height={68}
          className="aspect-video w-[120px] shrink-0 rounded-control bg-primario-tinte object-cover max-md:w-[88px]"
        />
      )}
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onOpen();
          }}
          className="truncate rounded-control text-left text-celda font-medium text-texto hover:text-primario focus-visible:shadow-foco"
        >
          {promotion.headline}
        </button>
        <span className="text-ayuda text-texto-tenue tabular">
          {formatDisplayWindow(
            promotion.displayStartsOn,
            promotion.displayEndsOn,
          )}
        </span>
      </span>
      {pill === undefined ? null : (
        <StatusPill tone={pill.tone}>{pill.label}</StatusPill>
      )}
    </article>
  );
}
