// STU-004. The break-even is the cash income that covers fixed costs, variable
// costs, and the tax on that income: (fixed + variable) / (1 - rate).
// FIX-008: the arithmetic stays in integers (centavos, and the rate in
// hundredths of a percent) so the derivation never prints float noise.

const basisPoints = 10_000;

// Half up, for non-negative integers.
const divideRounded = (numerator: number, denominator: number) =>
  Math.floor((2 * numerator + denominator) / (2 * denominator));

// Centavos print as bolivianos with their two places.
const withCentavos = (centavos: number) =>
  `${Math.trunc(centavos / 100)}.${String(centavos % 100).padStart(2, '0')}`;

// 8_400 basis points print as 0.84, 8_350 as 0.835.
const fraction = (points: number) =>
  `${Math.trunc(points / basisPoints)}.${String(points % basisPoints)
    .padStart(4, '0')
    .replace(/0+$/, '')}`.replace(/\.$/, '');

export const breakEven = (input: {
  fixedCostsCentavos: number;
  variableCostsCentavos: number;
  taxRatePercent: number;
}) => {
  const divisorPoints =
    basisPoints - Math.round(input.taxRatePercent * (basisPoints / 100));
  const costsCentavos = input.fixedCostsCentavos + input.variableCostsCentavos;
  const breakEvenCentavos = divideRounded(
    costsCentavos * basisPoints,
    divisorPoints,
  );
  const fixed = input.fixedCostsCentavos;
  const variable = input.variableCostsCentavos;
  // Whole costs print bare, as the owner writes them.
  const shown =
    fixed % 100 === 0 && variable % 100 === 0
      ? [String(fixed / 100), String(variable / 100)]
      : [withCentavos(fixed), withCentavos(variable)];
  return {
    breakEvenCentavos,
    derivation: `(${shown[0]} + ${shown[1]}) / ${fraction(divisorPoints)} = ${withCentavos(breakEvenCentavos)}`,
  };
};
