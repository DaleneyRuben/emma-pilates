// STU-004. The break-even is the cash income that covers fixed costs, variable
// costs, and the tax on that income: (fixed + variable) / (1 - rate).

export const breakEven = (input: {
  fixedCostsCentavos: number;
  variableCostsCentavos: number;
  taxRatePercent: number;
}) => {
  const divisor = 1 - input.taxRatePercent / 100;
  const breakEvenCentavos = Math.round(
    (input.fixedCostsCentavos + input.variableCostsCentavos) / divisor,
  );
  const fixed = (input.fixedCostsCentavos / 100).toString();
  const variable = (input.variableCostsCentavos / 100).toString();
  const exact = (
    (input.fixedCostsCentavos + input.variableCostsCentavos) /
    divisor /
    100
  ).toFixed(2);
  return {
    breakEvenCentavos,
    derivation: `(${fixed} + ${variable}) / ${divisor} = ${exact}`,
  };
};
