import { rollingBudgetWaitSeconds } from './rolling-budget';

const now = new Date('2026-10-01T15:00:00.000Z');
const ago = (seconds: number) => new Date(now.getTime() - seconds * 1_000);
const limits = [
  { windowMilliseconds: 60_000, allowed: 2 },
  { windowMilliseconds: 600_000, allowed: 3 },
];

describe('rollingBudgetWaitSeconds', () => {
  it('has no wait while every window has room', () => {
    expect(rollingBudgetWaitSeconds([ago(10)], now, limits)).toBe(0);
  });

  it('waits for the longest full window, rounded up to a second', () => {
    expect(
      rollingBudgetWaitSeconds([ago(500.5), ago(30), ago(10)], now, limits),
    ).toBe(100);
  });

  it('ignores events that already left every window', () => {
    expect(rollingBudgetWaitSeconds([ago(601), ago(700)], now, limits)).toBe(0);
  });
});
