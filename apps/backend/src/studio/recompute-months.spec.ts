import { studioMonthsToRecompute } from './recompute-months';

const months = (instant: string) =>
  studioMonthsToRecompute(new Date(instant)).map((month) =>
    month.toISOString().slice(0, 7),
  );

// FIX-008 (review 2026-10-28): the previous month was never finalized. Late
// attendance, voids, and window-close snapshots keep changing it, so the
// daily run recomputes it through day 8 of the next month, La Paz time.
describe('studio months to recompute', () => {
  it('recomputes only the current month from day 9 on', () => {
    expect(months('2026-11-20T15:00:00.000Z')).toEqual(['2026-11']);
    // 00:30 on Nov 9 in La Paz.
    expect(months('2026-11-09T04:30:00.000Z')).toEqual(['2026-11']);
  });

  it('also recomputes the previous month through day 8, La Paz time', () => {
    expect(months('2026-11-01T04:30:00.000Z')).toEqual(['2026-10', '2026-11']);
    // 23:30 on Nov 8 in La Paz is already Nov 9 in UTC.
    expect(months('2026-11-09T03:30:00.000Z')).toEqual(['2026-10', '2026-11']);
  });

  it('crosses the year in January', () => {
    expect(months('2027-01-05T15:00:00.000Z')).toEqual(['2026-12', '2027-01']);
  });
});
