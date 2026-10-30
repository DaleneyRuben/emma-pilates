import { breakEven } from './break-even';
import { projectMonths, weeksInAMonth } from './project-months';

// STU-005. Three scenarios, no I/O. Base repeats the simulator month. Low is
// 80 % of those students. High is 120 %, capped at the class capacity the
// caller passes (default 12). A month is the weekly schedule times 4.33,
// the same constant the Simulador page uses. Income is what Clients pay per
// class; variable cost is Trainer pay by the BKO-006 formula (FIX-008).

const owner = {
  classesPerWeek: 33,
  studentsPerClass: 4,
  clientPricePerClassCentavos: 7_000,
  trainerPay: {
    classCentavos: 6_500,
    includedStudents: 4,
    extraStudentCentavos: 800,
  },
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
    const result = projectMonths(owner, { includeMonth: true });
    const one = horizon(result, 1, 'base');
    const three = horizon(result, 3, 'base');
    const classes = Math.round(33 * 4.33);

    expect(classes).toBe(143);
    expect(one).toMatchObject({
      months: 1,
      scenario: 'base',
      revenueCentavos: 143 * 4 * 7_000,
      costCentavos: 2_117_500 + 143 * 6_500,
      taxCentavos: Math.round((143 * 4 * 7_000 * 16) / 100),
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
    expect(high?.revenueCentavos).toBe(143 * 5 * 7_000 * 3);

    const crowded = projectMonths({ ...owner, studentsPerClass: 11 });
    const capped = horizon(crowded, 3, 'high');
    // 11 * 1.2 = 13.2, which the default capacity of 12 cuts to 12.
    expect(capped?.revenueCentavos).toBe(143 * 12 * 7_000 * 3);

    const tighter = projectMonths(
      { ...owner, studentsPerClass: 8 },
      { classCapacity: 9 },
    );
    expect(horizon(tighter, 6, 'high')?.revenueCentavos).toBe(
      143 * 9 * 7_000 * 6,
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

  // FIX-008 (review 2026-10-28): one price stood for both what a Client pays
  // and what a Trainer earns, and the Bs 8 per extra student was ignored.
  it('charges the Client price and pays the Trainer Bs 65 plus Bs 8 from the fifth student', () => {
    const result = projectMonths(owner);
    const base = horizon(result, 3, 'base');
    const high = horizon(result, 3, 'high');
    const low = horizon(result, 3, 'low');

    expect(base?.revenueCentavos).toBe(143 * 4 * 7_000 * 3);
    expect(base?.costCentavos).toBe((2_117_500 + 143 * 6_500) * 3);
    // High has 5 students: Bs 65 + 1 extra × Bs 8 = Bs 73 a class.
    expect(high?.costCentavos).toBe((2_117_500 + 143 * 7_300) * 3);
    // Low has 3 students, still the Bs 65 class rate.
    expect(low?.costCentavos).toBe((2_117_500 + 143 * 6_500) * 3);
    expect(high?.breakEvenCentavos).toBe(
      breakEven({
        fixedCostsCentavos: 2_117_500,
        variableCostsCentavos: 143 * 7_300,
        taxRatePercent: 16,
      }).breakEvenCentavos,
    );
  });
});
