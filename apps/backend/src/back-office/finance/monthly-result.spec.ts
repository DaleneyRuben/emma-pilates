import { breakEvenCentavos, monthlyResult } from './monthly-result';

const budgetLines = [
  { name: 'Alquiler', monthlyCentavos: 850_000 },
  { name: 'Coordinadora', monthlyCentavos: 350_000 },
  { name: 'Recepción', monthlyCentavos: 340_000 },
  { name: 'Luz, agua e internet', monthlyCentavos: 60_000 },
  { name: 'Software', monthlyCentavos: 15_000 },
  { name: 'Limpieza', monthlyCentavos: 80_000 },
  { name: 'Contador', monthlyCentavos: 80_000 },
  { name: 'Mantenimiento', monthlyCentavos: 10_000 },
  { name: 'Anuncios', monthlyCentavos: 100_000 },
  { name: 'Insumos', monthlyCentavos: 40_000 },
];

describe('the monthly result', () => {
  it("works the owner's break-even out to about Bs 36,270", () => {
    // Diagnosis check: 143 classes at Bs 65 (Bs 9,295), fixed costs Bs 21,175,
    // tax 16 %. (21,175 + 9,295) / 0.84 ≈ 36,270.
    expect(
      breakEvenCentavos({
        fixedCostsCentavos: 2_117_500,
        variableCostsCentavos: 929_500,
        taxRatePercent: 16,
      }),
    ).toBe(3_627_381);
  });

  it('charges tax on cash income and keeps the budget next to the actual', () => {
    const result = monthlyResult({
      cashIncomeCentavos: 4_000_000,
      taxRatePercent: 16,
      budgetLines,
      contingencyPercent: 10,
      actualByLineCentavos: { Alquiler: 850_000 },
      nutritionistCostCentavos: 15_000,
    });

    expect(result.taxCentavos).toBe(640_000);
    expect(result.budgetSubtotalCentavos).toBe(1_925_000);
    expect(result.contingencyCentavos).toBe(192_500);
    expect(result.budgetTotalCentavos).toBe(2_117_500);
    expect(result.resultCentavos).toBe(4_000_000 - 640_000 - 850_000 - 15_000);
  });
});
