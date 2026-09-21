import { boliviaDate } from './bolivia-time';

describe('Bolivia civil date', () => {
  it('encodes the Bolivia calendar day at UTC midnight', () => {
    expect(boliviaDate(new Date('2026-09-21T04:00:00.000Z'))).toEqual(
      new Date('2026-09-21T00:00:00.000Z'),
    );
  });

  it('stays on the previous Bolivia day before 04:00 UTC', () => {
    expect(boliviaDate(new Date('2026-09-21T03:30:00.000Z'))).toEqual(
      new Date('2026-09-20T00:00:00.000Z'),
    );
  });
});
