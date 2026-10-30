import { breakEven } from './break-even';

describe('the studio simulator', () => {
  it("works the owner's check out to about Bs 36,270", () => {
    // 143 classes at Bs 65 (Bs 9,295), fixed costs Bs 21,175, tax 16 %.
    // (21,175 + 9,295) / 0.84 ≈ 36,270.38.
    const result = breakEven({
      fixedCostsCentavos: 2_117_500,
      variableCostsCentavos: 929_000,
      taxRatePercent: 16,
    });

    expect(result.breakEvenCentavos).toBe(3_626_786);
    expect(result.derivation).toBe('(21175 + 9290) / 0.84 = 36267.86');
  });

  it('moves the break-even up when the tax rate rises', () => {
    const base = breakEven({
      fixedCostsCentavos: 2_117_500,
      variableCostsCentavos: 929_000,
      taxRatePercent: 16,
    });
    const higher = breakEven({
      fixedCostsCentavos: 2_117_500,
      variableCostsCentavos: 929_000,
      taxRatePercent: 20,
    });

    expect(higher.breakEvenCentavos).toBeGreaterThan(base.breakEvenCentavos);
  });

  // FIX-008 (review 2026-10-28): the derivation printed float noise.
  it('prints the divisor without float noise', () => {
    const result = breakEven({
      fixedCostsCentavos: 100_000,
      variableCostsCentavos: 0,
      taxRatePercent: 7,
    });

    expect(result.derivation).toBe('(1000 + 0) / 0.93 = 1075.27');
    expect(result.breakEvenCentavos).toBe(107_527);
  });

  it('prints amounts with centavos to two places and the result it rounded', () => {
    const result = breakEven({
      fixedCostsCentavos: 2_117_550,
      variableCostsCentavos: 929_005,
      taxRatePercent: 3,
    });

    // (21175.50 + 9290.05) / 0.97 = 31407.78350…, rounded to the centavo.
    expect(result.derivation).toBe('(21175.50 + 9290.05) / 0.97 = 31407.78');
    expect(result.breakEvenCentavos).toBe(3_140_778);
  });
});
