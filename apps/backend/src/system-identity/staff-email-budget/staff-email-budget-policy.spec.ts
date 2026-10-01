import { staffEmailWaitSeconds } from './staff-email-budget-policy';

const now = new Date('2026-10-01T15:00:00.000Z');
const minutes = (count: number) => count * 60;
const ago = (seconds: number) => new Date(now.getTime() - seconds * 1_000);
// `count` events, the oldest `oldestSecondsAgo` and the rest one second apart.
const burst = (count: number, oldestSecondsAgo: number) =>
  Array.from({ length: count }, (_, index) => ago(oldestSecondsAgo - index));

describe('staffEmailWaitSeconds (BE-013 Account lane)', () => {
  it('lets a request through while the Account has room', () => {
    expect(staffEmailWaitSeconds(burst(19, minutes(5)), now)).toBe(0);
  });

  it('allows twenty requests per Account in a rolling 15 minutes', () => {
    expect(staffEmailWaitSeconds(burst(20, minutes(14)), now)).toBe(60);
  });

  it('allows one hundred requests per Account in a rolling day', () => {
    const spread = Array.from({ length: 100 }, (_, index) =>
      ago(minutes(60 * 22) - index * minutes(6)),
    );

    expect(staffEmailWaitSeconds(spread, now)).toBe(minutes(60 * 2));
    expect(staffEmailWaitSeconds(spread.slice(1), now)).toBe(0);
  });

  it('forgets events older than a day', () => {
    expect(staffEmailWaitSeconds(burst(100, minutes(60 * 24) + 200), now)).toBe(
      0,
    );
  });
});
