import { parseCivilMonth } from './civil-month';

// FIX-007: «2026-13» passed the old shape check and became an Invalid Date
// deeper down, a 500. Only a real month parses.
describe('parseCivilMonth', () => {
  it('reads a real month as its first day at UTC midnight', () => {
    expect(parseCivilMonth('2026-11')).toEqual(
      new Date('2026-11-01T00:00:00.000Z'),
    );
    expect(parseCivilMonth('2027-01')).toEqual(
      new Date('2027-01-01T00:00:00.000Z'),
    );
  });

  it('refuses anything that is not a month', () => {
    for (const text of ['2026-13', '2026-00', '2026-1', '26-11', '', 'abc']) {
      expect(parseCivilMonth(text)).toBeNull();
    }
    expect(parseCivilMonth(undefined)).toBeNull();
  });
});
