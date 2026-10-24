import { computeSubscriptionTerm } from './subscription-term';

const civil = (date: string): Date => new Date(`${date}T00:00:00.000Z`);

// booking ADR-0005: the end date is the Start Date plus the days minus one.
describe('computeSubscriptionTerm', () => {
  it('ends on the last of the snapshotted days, the Start Date included', () => {
    expect(computeSubscriptionTerm(civil('2026-12-01'), 60)).toEqual({
      startsOn: civil('2026-12-01'),
      endsOn: civil('2027-01-29'),
    });
    expect(computeSubscriptionTerm(civil('2026-09-22'), 30).endsOn).toEqual(
      civil('2026-10-21'),
    );
    expect(computeSubscriptionTerm(civil('2026-11-15'), 90).endsOn).toEqual(
      civil('2027-02-12'),
    );
  });

  it('counts days across a leap February', () => {
    expect(computeSubscriptionTerm(civil('2028-02-01'), 30).endsOn).toEqual(
      civil('2028-03-01'),
    );
  });
});
