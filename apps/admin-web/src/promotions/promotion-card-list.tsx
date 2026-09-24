import type { AdminPromotionDto } from "@pilates/api-contracts";
import { Fragment, useId } from "react";
import { cn } from "../lib/cn";
import { PromotionCard } from "./promotion-card";
import { usePromotionDragOrder } from "./use-promotion-order";

// AW17: separate cards with 10 px of air, an insertion line while a card
// is lifted, and a live region for the keyboard route (follow-up 39).
export function PromotionCardList({
  promotions,
  onOpen,
}: {
  promotions: AdminPromotionDto[];
  onOpen: (promotion: AdminPromotionDto) => void;
}) {
  const hintId = useId();
  const order = usePromotionDragOrder(promotions);

  const marker = (
    <li aria-hidden="true" className="relative h-0">
      <span className="absolute inset-x-0 -top-[6px] flex items-center gap-2">
        <span className="h-0.5 flex-1 rounded-full bg-primario" />
        <span className="rounded-full bg-primario px-2 py-0.5 text-[10.5px] font-medium text-blanco">
          {order.insertion?.label}
        </span>
      </span>
    </li>
  );

  return (
    <>
      <p id={hintId} className="sr-only">
        Con el teclado: la barra espaciadora toma la tarjeta, las flechas la
        mueven, la barra espaciadora la suelta y Escape cancela.
      </p>
      <p role="status" aria-live="polite" className="sr-only">
        {order.announcement}
      </p>
      {order.failure === null ? null : (
        <p role="alert" className="text-nota text-error-texto">
          {order.failure}
        </p>
      )}
      <ol
        aria-label="Promociones en el orden del carrusel"
        className={cn(
          "flex flex-col gap-2.5",
          order.insertion !== null && "select-none",
        )}
      >
        {order.ordered.map((promotion, index) => (
          <Fragment key={promotion.id}>
            {order.insertion?.before === index ? marker : null}
            <li>
              <PromotionCard
                promotion={promotion}
                position={index + 1}
                onOpen={() => onOpen(promotion)}
                cardRef={order.cardRef(promotion.id)}
                card={order.cardState(promotion.id)}
                handle={{
                  ...order.handleState(promotion.id),
                  describedBy: hintId,
                }}
              />
            </li>
          </Fragment>
        ))}
        {order.insertion?.before === order.ordered.length ? marker : null}
      </ol>
    </>
  );
}
