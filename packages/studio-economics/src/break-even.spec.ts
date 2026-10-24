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
});
