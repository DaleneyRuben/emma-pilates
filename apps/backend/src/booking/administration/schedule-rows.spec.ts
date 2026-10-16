import { findRowClash } from './schedule-rows';

const row = (weekday: number, startsAtLocal: string, durationMinutes = 50) => ({
  weekday,
  startsAtLocal,
  durationMinutes,
});

describe('several weekly rows created together (WEB-025)', () => {
  it('accepts rows on different days or far enough apart', () => {
    expect(
      findRowClash([row(1, '07:00'), row(3, '07:00'), row(5, '18:30')]),
    ).toBeNull();
    expect(findRowClash([row(1, '07:00'), row(1, '07:50')])).toBeNull();
  });

  it('names the later row that repeats an earlier day and time', () => {
    expect(
      findRowClash([row(1, '07:00'), row(3, '07:00'), row(1, '07:00')]),
    ).toEqual({ row: 3, clashesWith: 1, kind: 'repeated' });
  });

  it('names the later row that starts inside an earlier one', () => {
    expect(findRowClash([row(2, '09:30', 45), row(2, '09:00', 45)])).toEqual({
      row: 2,
      clashesWith: 1,
      kind: 'overlap',
    });
  });

  it('counts a Sunday night class running past midnight into Monday', () => {
    expect(findRowClash([row(7, '23:30'), row(1, '00:10')])).toEqual({
      row: 2,
      clashesWith: 1,
      kind: 'overlap',
    });
  });
});

describe('each weekly row lasts its own duration (WEB-027)', () => {
  it('lets a short row end before a later one starts', () => {
    expect(findRowClash([row(1, '07:00', 30), row(1, '07:30', 90)])).toBeNull();
  });

  it('refuses a later row that starts inside a longer earlier one', () => {
    expect(findRowClash([row(1, '07:00', 90), row(1, '08:00', 30)])).toEqual({
      row: 2,
      clashesWith: 1,
      kind: 'overlap',
    });
  });

  it('refuses a long later row that runs into an earlier one', () => {
    expect(findRowClash([row(1, '08:00', 30), row(1, '07:00', 90)])).toEqual({
      row: 2,
      clashesWith: 1,
      kind: 'overlap',
    });
  });
});
