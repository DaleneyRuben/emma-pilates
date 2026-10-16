import { findRowClash } from './schedule-rows';

const row = (weekday: number, startsAtLocal: string) => ({
  weekday,
  startsAtLocal,
});

describe('several weekly rows created together (WEB-025)', () => {
  it('accepts rows on different days or far enough apart', () => {
    expect(
      findRowClash([row(1, '07:00'), row(3, '07:00'), row(5, '18:30')], 50),
    ).toBeNull();
    expect(findRowClash([row(1, '07:00'), row(1, '07:50')], 50)).toBeNull();
  });

  it('names the later row that repeats an earlier day and time', () => {
    expect(
      findRowClash([row(1, '07:00'), row(3, '07:00'), row(1, '07:00')], 50),
    ).toEqual({ row: 3, clashesWith: 1, kind: 'repeated' });
  });

  it('names the later row that starts inside an earlier one', () => {
    expect(findRowClash([row(2, '09:30'), row(2, '09:00')], 45)).toEqual({
      row: 2,
      clashesWith: 1,
      kind: 'overlap',
    });
  });

  it('counts a Sunday night class running past midnight into Monday', () => {
    expect(findRowClash([row(7, '23:30'), row(1, '00:10')], 50)).toEqual({
      row: 2,
      clashesWith: 1,
      kind: 'overlap',
    });
  });
});
