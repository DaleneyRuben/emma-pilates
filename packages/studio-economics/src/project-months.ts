import { breakEven } from './break-even';

// STU-005. The Simulador page (simulate-month.ts) still multiplies by its own
// 4.33. This is the same constant; the page was left alone so its tests stay
// the proof of that copy.

export const weeksInAMonth = 4.33;

const horizons = [3, 6, 12] as const;
const scenarios = ['low', 'base', 'high'] as const;

export type ProjectionScenario = (typeof scenarios)[number];

export type ProjectionInput = {
  classesPerWeek: number;
  studentsPerClass: number;
  pricePerClassCentavos: number;
  fixedCostsCentavos: number;
  taxRatePercent: number;
};

export type MonthProjection = {
  months: number;
  scenario: ProjectionScenario;
  revenueCentavos: number;
  costCentavos: number;
  taxCentavos: number;
  resultCentavos: number;
  breakEvenCentavos: number;
};

const studentsFor = (
  studentsPerClass: number,
  scenario: ProjectionScenario,
  classCapacity: number,
) => {
  if (scenario === 'low') return studentsPerClass * 0.8;
  if (scenario === 'high') {
    return Math.min(studentsPerClass * 1.2, classCapacity);
  }
  return studentsPerClass;
};

const projectOne = (
  input: ProjectionInput,
  months: number,
  scenario: ProjectionScenario,
  classCapacity: number,
): MonthProjection => {
  const classes = Math.round(input.classesPerWeek * weeksInAMonth);
  const students = Math.round(
    studentsFor(input.studentsPerClass, scenario, classCapacity),
  );
  const revenueCentavos =
    input.pricePerClassCentavos * students * classes * months;
  const costCentavos =
    input.fixedCostsCentavos * months +
    input.pricePerClassCentavos * classes * months;
  const taxCentavos = Math.round(
    (revenueCentavos * input.taxRatePercent) / 100,
  );
  return {
    months,
    scenario,
    revenueCentavos,
    costCentavos,
    taxCentavos,
    resultCentavos: revenueCentavos - taxCentavos - costCentavos,
    breakEvenCentavos: breakEven({
      fixedCostsCentavos: input.fixedCostsCentavos,
      variableCostsCentavos: input.pricePerClassCentavos * classes,
      taxRatePercent: input.taxRatePercent,
    }).breakEvenCentavos,
  };
};

export const projectMonths = (
  input: ProjectionInput,
  options: { classCapacity?: number; includeMonth?: boolean } = {},
): MonthProjection[] => {
  const classCapacity = options.classCapacity ?? 12;
  const span = options.includeMonth ? [1, ...horizons] : [...horizons];
  return span.flatMap((months) =>
    scenarios.map((scenario) =>
      projectOne(input, months, scenario, classCapacity),
    ),
  );
};
