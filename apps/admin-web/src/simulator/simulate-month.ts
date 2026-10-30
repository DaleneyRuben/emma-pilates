import { breakEven } from "@pilates/studio-economics";
import type { ProjectionInput } from "@pilates/studio-economics/project-months";
import { trainerPayPerClassCentavos } from "@pilates/studio-economics/trainer-pay";

// STU-004. A month is four weeks plus the leftover days, so a weekly schedule
// is multiplied by 4.33 and rounded: 33 classes a week is the owner's 143.
// Income is the students times what a Client pays per class. Trainer pay is
// the only variable cost this page edits, by the BKO-006 formula: the class
// rate plus the extra rate from the fifth student (FIX-008). Nothing is saved.
const weeksInAMonth = 4.33;

export type SimulatorInput = ProjectionInput;

export const simulateMonth = (input: SimulatorInput) => {
  const classes = Math.round(input.classesPerWeek * weeksInAMonth);
  const variableCostsCentavos =
    classes *
    trainerPayPerClassCentavos(input.trainerPay, input.studentsPerClass);
  const incomeCentavos = Math.round(
    classes * input.studentsPerClass * input.clientPricePerClassCentavos,
  );
  const taxCentavos = Math.round((incomeCentavos * input.taxRatePercent) / 100);
  const point = breakEven({
    fixedCostsCentavos: input.fixedCostsCentavos,
    variableCostsCentavos,
    taxRatePercent: input.taxRatePercent,
  });
  return {
    classes,
    incomeCentavos,
    taxCentavos,
    variableCostsCentavos,
    resultCentavos:
      incomeCentavos -
      taxCentavos -
      input.fixedCostsCentavos -
      variableCostsCentavos,
    breakEvenCentavos: point.breakEvenCentavos,
    derivation: point.derivation,
  };
};
