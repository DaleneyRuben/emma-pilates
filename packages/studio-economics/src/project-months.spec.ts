import { breakEven } from './break-even';
import { projectMonths, weeksInAMonth } from './project-months';

// STU-005. Three scenarios, no I/O. Base repeats the simulator month. Low is
// 80 % of those students. High is 120 %, capped at the class capacity the
// caller passes (default 12). A month is the weekly schedule times 4.33,
// the same constant the Simulador page uses. Variable cost is trainer pay:
// classes times the price per class, as simulateMonth already does.

const owner = {
  classesPerWeek: 33,
  studentsPerClass: 4,
  pricePerClassCentavos: 6_500,
  fixedCostsCentavos: 2_117_500,
  taxRatePercent: 16,
};

const horizon = (
  result: ReturnType<typeof projectMonths>,
  months: number,
  scenario: 'base' | 'low' | 'high',
) => result.find((row) => row.months === months && row.scenario === scenario);

describe('studio projections', () => {
  it('repeats the opening month, and three months are three times one', () => {
    expect(weeksInAMonth).toBe(4.33);
    const result = projectMonths(owner);
    const one = horizon(result, 1, 'base');
    const three = horizon(result, 3, 'base');
    const classes = Math.round(33 * 4.33);

    expect(classes).toBe(143);
    expect(one).toMatchObject({
      months: 1,
      scenario: 'base',
      revenueCentavos: 143 * 4 * 6_500,
      costCentavos: 2_117_500 + 143 * 6_500,
      taxCentavos: Math.round((143 * 4 * 6_500 * 16) / 100),
      breakEvenCentavos: breakEven({
        fixedCostsCentavos: 2_117_500,
        variableCostsCentavos: 143 * 6_500,
        taxRatePercent: 16,
      }).breakEvenCentavos,
    });
    expect(one?.resultCentavos).toBe(
      (one?.revenueCentavos ?? 0) -
        (one?.taxCentavos ?? 0) -
        (one?.costCentavos ?? 0),
    );
    expect(three).toMatchObject({
      months: 3,
      revenueCentavos: (one?.revenueCentavos ?? 0) * 3,
      costCentavos: (one?.costCentavos ?? 0) * 3,
      taxCentavos: (one?.taxCentavos ?? 0) * 3,
      resultCentavos: (one?.resultCentavos ?? 0) * 3,
      breakEvenCentavos: one?.breakEvenCentavos,
    });
  });

  it('drops occupancy in the low scenario and raises it in the high, capped at capacity', () => {
    const result = projectMonths(owner);
    const low = horizon(result, 3, 'low');
    const base = horizon(result, 3, 'base');
    const high = horizon(result, 3, 'high');

    expect(low?.revenueCentavos).toBeLessThan(base?.revenueCentavos ?? 0);
    expect(base?.revenueCentavos).toBeLessThan(high?.revenueCentavos ?? 0);
    // 4 * 1.2 = 4.8, so the month's class-students round to 5.
    expect(high?.revenueCentavos).toBe(143 * 5 * 6_500 * 3);

    const crowded = projectMonths({ ...owner, studentsPerClass: 11 });
    const capped = horizon(crowded, 3, 'high');
    // 11 * 1.2 = 13.2, which the default capacity of 12 cuts to 12.
    expect(capped?.revenueCentavos).toBe(143 * 12 * 6_500 * 3);

    const tighter = projectMonths(
      { ...owner, studentsPerClass: 8 },
      { classCapacity: 9 },
    );
    expect(horizon(tighter, 6, 'high')?.revenueCentavos).toBe(
      143 * 9 * 6_500 * 6,
    );
  });

  it('returns every horizon and scenario, and a higher tax lowers the result', () => {
    const result = projectMonths(owner);
    expect(result.map((row) => [row.months, row.scenario])).toEqual([
      [3, 'low'],
      [3, 'base'],
      [3, 'high'],
      [6, 'low'],
      [6, 'base'],
      [6, 'high'],
      [12, 'low'],
      [12, 'base'],
      [12, 'high'],
    ]);

    const sixteen = horizon(result, 12, 'base');
    const twenty = horizon(
      projectMonths({ ...owner, taxRatePercent: 20 }),
      12,
      'base',
    );
    expect(twenty?.taxCentavos).toBeGreaterThan(sixteen?.taxCentavos ?? 0);
    expect(twenty?.resultCentavos).toBeLessThan(sixteen?.resultCentavos ?? 0);
    expect(twenty?.revenueCentavos).toBe(sixteen?.revenueCentavos);
  });
});
