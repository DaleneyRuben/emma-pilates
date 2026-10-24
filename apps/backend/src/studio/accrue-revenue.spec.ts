import { accrueRevenue, type AccrualPayment } from './accrue-revenue';

const month = (value: string): Date => new Date(`${value}-01T00:00:00.000Z`);

const payment = (overrides: Partial<AccrualPayment> = {}): AccrualPayment => ({
  id: '11111111-1111-4111-8111-111111111111',
  amountCentavos: 30_000,
  decidedOn: new Date('2026-10-20T00:00:00.000Z'),
  startsOn: new Date('2026-10-20T00:00:00.000Z'),
  endsOn: new Date('2026-11-19T00:00:00.000Z'),
  state: 'confirmed',
  excludedFromAnalytics: false,
  ...overrides,
});

describe('accrue revenue', () => {
  it('accrues a 30-day payment of Bs 300 across the month boundary and the months sum to 300', () => {
    const october = accrueRevenue(
      [payment()],
      month('2026-10'),
      month('2026-10'),
    );
    const november = accrueRevenue(
      [payment()],
      month('2026-11'),
      month('2026-10'),
    );

    // 12 of 30 days fall in October: 300 * 12 / 30 = 120. November, the last
    // month, absorbs the remainder so the two months sum to the Payment.
    expect(october.accruedCentavos).toBe(12_000);
    expect(november.accruedCentavos).toBe(18_000);
    expect(october.accruedCentavos + november.accruedCentavos).toBe(30_000);
  });

  it('keeps every month non-negative when half-up rounding would overshoot the amount', () => {
    const crossing = payment({
      amountCentavos: 78_000,
      decidedOn: new Date('2026-09-27T00:00:00.000Z'),
      startsOn: new Date('2026-09-27T00:00:00.000Z'),
      endsOn: new Date('2026-10-27T00:00:00.000Z'),
    });
    const september = accrueRevenue(
      [crossing],
      month('2026-09'),
      month('2026-10'),
    );
    const october = accrueRevenue(
      [crossing],
      month('2026-10'),
      month('2026-10'),
    );
    const november = accrueRevenue(
      [crossing],
      month('2026-11'),
      month('2026-10'),
    );

    // 4 of 30 days fall in September: 780 * 4 / 30 rounds to 104. October,
    // the last month, absorbs the remainder. November has no days left.
    expect(september.accruedCentavos).toBe(10_400);
    expect(october.accruedCentavos).toBe(67_600);
    expect(november.accruedCentavos).toBe(0);
    expect(
      september.accruedCentavos +
        october.accruedCentavos +
        november.accruedCentavos,
    ).toBe(78_000);
  });
});
