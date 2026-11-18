import type { EvaluationAvailabilityDto } from "@pilates/api-contracts";
import { formatBolivianos } from "@pilates/mobile-core";

import { evaluationDayMonth } from "./evaluation-format";

// Walkthrough finding 69: only a Plan of 90 days or longer includes its first
// Evaluation (NUT-003). A free slot on screen wins, since it may fall under a
// next Plan. An older backend sends no offer: the slots say it, and with no
// price known the line is left out rather than reading «Bs 0».
export function planOfferLine(availability: EvaluationAvailabilityDto): string | null {
  const slots = availability.days.flatMap((day) => day.slots);
  const firstFree = slots.find((slot) => slot.included);
  // Walkthrough finding 100: a next Plan may include it while the first
  // slots, under the current one, still cost: say from when it is free.
  const paidBefore = slots.find(
    (slot) => !slot.included && firstFree !== undefined && slot.startsAt < firstFree.startsAt,
  );
  if (firstFree !== undefined && paidBefore !== undefined) {
    return `Desde el ${evaluationDayMonth(firstFree.startsAt)}, tu primera evaluación del trimestre es gratis. Antes cuesta ${formatBolivianos(paidBefore.priceCentavos)}.`;
  }
  if (firstFree !== undefined) {
    return "Tu primera evaluación del trimestre es gratis.";
  }
  const offer = availability.includedEvaluation ?? "none";
  if (offer === "available") return "Tu primera evaluación del trimestre es gratis.";
  const centavos =
    availability.priceCentavos ?? slots.find((slot) => !slot.included)?.priceCentavos;
  if (centavos === undefined) return null;
  const price = formatBolivianos(centavos);
  return offer === "used"
    ? `Ya usaste la gratis de este trimestre · ${price}.`
    : `Cuesta ${price} con tu plan.`;
}
