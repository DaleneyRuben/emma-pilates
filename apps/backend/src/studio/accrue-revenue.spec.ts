import { accrueRevenue, type AccrualPayment } from './accrue-revenue';

const month = (value: string): Date => new Date(`${value}-01T00:00:00.000Z`);

const day = (value: string): Date => new Date(`${value}T00:00:00.000Z`);

// A 30-day Plan bought for Oct 20 ends on Nov 18: endsOn is inclusive
// (subscription-term.ts adds durationDays - 1).
const payment = (overrides: Partial<AccrualPayment> = {}): AccrualPayment => ({
  id: '11111111-1111-4111-8111-111111111111',
  kind: 'plan',
  amountCentavos: 30_000,
  decidedOn: day('2026-10-20'),
  startsOn: day('2026-10-20'),
  endsOn: day('2026-11-18'),
  state: 'confirmed',
  excludedFromAnalytics: false,
  ...overrides,
});

describe('accrue revenue', () => {
  it('accrues a 30-day payment of Bs 300 across the month boundary and the months sum to 300', () => {
    const october = accrueRevenue(
      [payment()],
      month('2026-10'),
      day('2026-10-23'),
    );
    const november = accrueRevenue(
      [payment()],
      month('2026-11'),
      day('2026-10-23'),
    );

    // Oct 20–31 is 12 of the 30 inclusive days: 300 * 12 / 30 = 120.
    expect(october.accruedCentavos).toBe(12_000);
    expect(november.accruedCentavos).toBe(18_000);
    expect(october.accruedCentavos + november.accruedCentavos).toBe(30_000);
  });

  it('defers what is not yet accrued, so the two never pass the amount by a centavo', () => {
    // Bs 0,05 over two days, on the second: one day accrued, rounded half up
    // to 3 centavos, so 2 are still owed.
    const october = accrueRevenue(
      [
        payment({
          amountCentavos: 5,
          decidedOn: day('2026-10-20'),
          startsOn: day('2026-10-20'),
          endsOn: day('2026-10-21'),
        }),
      ],
      month('2026-10'),
      day('2026-10-21'),
    );

    expect(october.deferredCentavos).toBe(2);
  });

  it('keeps every month non-negative when half-up rounding would overshoot the amount', () => {
    const crossing = payment({
      amountCentavos: 78_000,
      decidedOn: day('2026-09-27'),
      startsOn: day('2026-09-27'),
      endsOn: day('2026-10-26'),
    });
    const accrued = ['2026-09', '2026-10', '2026-11'].map(
      (value) =>
        accrueRevenue([crossing], month(value), day('2026-10-23'))
          .accruedCentavos,
    );

    // Sep 27–30 is 4 of 30 days: 780 * 4 / 30 = 104. November has no days.
    expect(accrued).toEqual([10_400, 67_600, 0]);
  });

  it('counts a payment approved on the 1st in that month only', () => {
    const first = payment({ decidedOn: day('2026-11-01') });

    expect(
      accrueRevenue([first], month('2026-10'), day('2026-11-05')).cashCentavos,
    ).toBe(0);
    expect(
      accrueRevenue([first], month('2026-11'), day('2026-11-05')).cashCentavos,
    ).toBe(30_000);
  });

  it('accrues a one-day plan whole in its month and never returns NaN', () => {
    const oneDay = payment({
      startsOn: day('2026-10-20'),
      endsOn: day('2026-10-20'),
    });

    const october = accrueRevenue(
      [oneDay],
      month('2026-10'),
      day('2026-10-20'),
    );
    const after = accrueRevenue([oneDay], month('2026-10'), day('2026-10-21'));

    expect(october).toEqual({
      accruedCentavos: 30_000,
      cashCentavos: 30_000,
      deferredCentavos: 30_000,
    });
    expect(after.deferredCentavos).toBe(0);
  });

  it('empties «Diferido» over the life of the plan, not at its first month end', () => {
    const at = (today: string) =>
      accrueRevenue([payment()], month('2026-11'), day(today)).deferredCentavos;

    // On Nov 10, Nov 10–18 is 9 of 30 days left: 300 * 9 / 30 = 90.
    expect(at('2026-11-10')).toBe(9_000);
    expect(at('2026-11-18')).toBe(1_000);
    expect(at('2026-11-19')).toBe(0);
  });

  it('measures a past month’s «Diferido» at that month’s end', () => {
    // October closes after Oct 20–31: 18 of 30 days are left on Nov 1.
    expect(
      accrueRevenue([payment()], month('2026-10'), day('2026-11-10'))
        .deferredCentavos,
    ).toBe(18_000);
    // A payment approved after the month closed was not deferred in it.
    expect(
      accrueRevenue(
        [
          payment({
            decidedOn: day('2026-11-02'),
            startsOn: day('2026-11-02'),
            endsOn: day('2026-12-01'),
          }),
        ],
        month('2026-10'),
        day('2026-11-10'),
      ).deferredCentavos,
    ).toBe(0);
  });

  it('puts an Evaluation in «Caja» and «Devengado» on its decision date and never defers it', () => {
    const evaluation = payment({
      id: '22222222-2222-4222-8222-222222222222',
      kind: 'evaluation',
      amountCentavos: 5_000,
      decidedOn: day('2026-10-21'),
      startsOn: null,
      endsOn: null,
    });

    expect(
      accrueRevenue([evaluation], month('2026-10'), day('2026-10-23')),
    ).toEqual({
      accruedCentavos: 5_000,
      cashCentavos: 5_000,
      deferredCentavos: 0,
    });
  });
});
