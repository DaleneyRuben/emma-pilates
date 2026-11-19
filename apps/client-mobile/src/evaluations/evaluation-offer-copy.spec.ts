import { formatListDate, type EvaluationAvailabilityDto } from "@pilates/api-contracts";

import { planOfferLine } from "./evaluation-offer-copy";
import { boliviaInstant, firstDay, secondDay, slot } from "./evaluation-test-support";

// Review of FIX-056: the line follows the slots on screen, and an older
// backend that sends no price never makes it say «Bs 0».
const availability = (
  slots: ReturnType<typeof slot>[],
  offer: Partial<Pick<EvaluationAvailabilityDto, "includedEvaluation" | "priceCentavos">> = {},
) =>
  ({
    days: slots.length === 0 ? [] : [{ date: firstDay, slots }],
    months: [],
    ...offer,
  }) as unknown as EvaluationAvailabilityDto;

describe("planOfferLine", () => {
  it("says free when a slot on screen is free under a next plan", () => {
    expect(
      planOfferLine(
        availability([slot("slot-1", firstDay, "09:00", { included: true, priceCentavos: 0 })], {
          includedEvaluation: "used",
          priceCentavos: 7_000,
        }),
      ),
    ).toBe("Tu primera evaluación del trimestre es gratis.");
  });

  it("takes the price from a paid slot on an older backend", () => {
    expect(
      planOfferLine(
        availability([
          slot("slot-1", firstDay, "09:00", { included: false, priceCentavos: 7_000 }),
        ]),
      ),
    ).toBe("Cuesta Bs 70 con tu plan.");
  });

  it("says nothing when an older backend gives no price", () => {
    expect(planOfferLine(availability([]))).toBeNull();
  });

  // Walkthrough finding 100: a paid Plan starting later includes the
  // Evaluation, so the first slots cost Bs 70 and later ones are free.
  it("says from when it is free when the first slots still cost", () => {
    const mixed = {
      days: [
        {
          date: firstDay,
          slots: [slot("slot-1", firstDay, "09:00", { included: false, priceCentavos: 7_000 })],
        },
        {
          date: secondDay,
          slots: [slot("slot-2", secondDay, "09:00", { included: true, priceCentavos: 0 })],
        },
      ],
      months: [],
      includedEvaluation: "none",
      priceCentavos: 7_000,
    } as unknown as EvaluationAvailabilityDto;
    const freeFrom = formatListDate(boliviaInstant(secondDay, "09:00"));

    expect(planOfferLine(mixed)).toBe(
      `Desde el ${freeFrom}, tu primera evaluación del trimestre es gratis. Antes cuesta Bs 70.`,
    );
  });
});
