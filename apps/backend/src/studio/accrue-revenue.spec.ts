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
});
