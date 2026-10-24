import { deprecatedDurationMonths, isValidPlanValidity } from './plan-validity';

// booking ADR-0005 and ADR-0006: 30, 60, or 90 days; a Weekly Cap of 3 or 4
// only on the 60- and 90-day Plans.
describe('plan validity', () => {
  it.each([
    [30, null],
    [60, null],
    [60, 3],
    [90, 4],
  ])('accepts %i days with a cap of %p', (durationDays, weeklyClassCap) => {
    expect(isValidPlanValidity({ durationDays, weeklyClassCap })).toBe(true);
  });

  it.each([
    [31, null],
    [0, null],
    [365, null],
    [30, 3],
    [60, 2],
    [90, 5],
    [90, 0],
  ])('refuses %i days with a cap of %p', (durationDays, weeklyClassCap) => {
    expect(isValidPlanValidity({ durationDays, weeklyClassCap })).toBe(false);
  });

  it('derives the deprecated months old builds still read (ADR-0016)', () => {
    expect(deprecatedDurationMonths(30)).toBe(1);
    expect(deprecatedDurationMonths(60)).toBe(2);
    expect(deprecatedDurationMonths(90)).toBe(3);
  });
});
