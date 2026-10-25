import { PaymentRuleError } from './payment-errors';
import { resolveStartDate } from './start-date';

const civil = (date: string): Date => new Date(`${date}T00:00:00.000Z`);
const today = civil('2026-10-23');

const baseline = {
  today,
  requested: null as Date | null,
  startDateLimitDays: 14,
  openingDate: null as Date | null,
  renewal: null,
};

const codeOf = (work: () => unknown): string | null => {
  try {
    work();
    return null;
  } catch (error) {
    return error instanceof PaymentRuleError ? error.code : 'unexpected';
  }
};

// booking ADR-0005: the Start Date is today by default, at most today plus
// the Studio Settings limit, with the Opening Date offered before it.
describe('resolveStartDate', () => {
  it('defaults to today and accepts today plus the limit, inclusive', () => {
    expect(resolveStartDate(baseline)).toEqual({
      startsOn: today,
      chosen: true,
    });
    expect(
      resolveStartDate({ ...baseline, requested: civil('2026-11-06') }),
    ).toEqual({ startsOn: civil('2026-11-06'), chosen: true });
  });

  it('refuses a date before today or past the limit with its own code', () => {
    expect(
      codeOf(() =>
        resolveStartDate({ ...baseline, requested: civil('2026-10-22') }),
      ),
    ).toBe('start_date_out_of_window');
    expect(
      codeOf(() =>
        resolveStartDate({ ...baseline, requested: civil('2026-11-07') }),
      ),
    ).toBe('start_date_out_of_window');
  });

  it('offers the Opening Date before it opens, even 30 days away', () => {
    const opening = civil('2026-11-22');
    const presale = { ...baseline, openingDate: opening };

    expect(resolveStartDate({ ...presale, requested: opening })).toEqual({
      startsOn: opening,
      chosen: true,
    });
    expect(
      codeOf(() =>
        resolveStartDate({ ...presale, requested: civil('2026-11-21') }),
      ),
    ).toBe('start_date_out_of_window');
  });

  it('offers no presale date once the studio has opened or none is stored', () => {
    expect(
      codeOf(() =>
        resolveStartDate({
          ...baseline,
          openingDate: civil('2026-10-23'),
          requested: civil('2026-11-22'),
        }),
      ),
    ).toBe('start_date_out_of_window');
    expect(
      codeOf(() =>
        resolveStartDate({
          ...baseline,
          requested: civil('2026-11-22'),
        }),
      ),
    ).toBe('start_date_out_of_window');
  });
});
