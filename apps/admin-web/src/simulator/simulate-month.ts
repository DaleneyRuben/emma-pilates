import { breakEven } from "@pilates/studio-economics";

// STU-004. A month is four weeks plus the leftover days, so a weekly schedule
// is multiplied by 4.33 and rounded: 33 classes a week is the owner's 143.
// Trainer pay is the only variable cost this page edits: classes times the
// price per class. Nothing is saved.
const weeksInAMonth = 4.33;

export type SimulatorInput = {
  classesPerWeek: number;
  studentsPerClass: number;
  pricePerClassCentavos: number;
  fixedCostsCentavos: number;
  taxRatePercent: number;
};

export const simulateMonth = (input: SimulatorInput) => {
  const classes = Math.round(input.classesPerWeek * weeksInAMonth);
  const variableCostsCentavos = classes * input.pricePerClassCentavos;
  const incomeCentavos = Math.round(
    classes * input.studentsPerClass * input.pricePerClassCentavos,
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
