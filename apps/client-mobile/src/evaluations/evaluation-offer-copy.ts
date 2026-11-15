import type { EvaluationAvailabilityDto } from "@pilates/api-contracts";
import { formatBolivianos } from "@pilates/mobile-core";

// Walkthrough finding 69: only a Plan of 90 days or longer includes its first
// Evaluation (NUT-003). An older backend sends no offer, so the slots say it.
export function planOfferLine(availability: EvaluationAvailabilityDto): string {
  const slots = availability.days.flatMap((day) => day.slots);
  const offer =
    availability.includedEvaluation ?? (slots.some((slot) => slot.included) ? "available" : "none");
  const price = formatBolivianos(
    availability.priceCentavos ?? slots.find((slot) => !slot.included)?.priceCentavos ?? 0,
  );
  if (offer === "available") return "Tu primera evaluación del trimestre es gratis.";
  if (offer === "used") return `Ya usaste la gratis de este trimestre · ${price}.`;
  return `Cuesta ${price} con tu plan.`;
}
