import { computeSubscriptionTerm } from './subscription-term';

const civil = (date: string): Date => new Date(`${date}T00:00:00.000Z`);

describe('computeSubscriptionTerm', () => {
  it('ends on the same calendar day after the snapshotted months', () => {
    expect(computeSubscriptionTerm(civil('2026-09-22'), 1)).toEqual({
      startsOn: civil('2026-09-22'),
      endsOn: civil('2026-10-22'),
    });
    expect(computeSubscriptionTerm(civil('2026-09-22'), 12).endsOn).toEqual(
      civil('2027-09-22'),
    );
  });

  it('clamps to the last day when the target month is shorter', () => {
    expect(computeSubscriptionTerm(civil('2026-01-31'), 1).endsOn).toEqual(
      civil('2026-02-28'),
    );
    expect(computeSubscriptionTerm(civil('2026-11-30'), 3).endsOn).toEqual(
      civil('2027-02-28'),
    );
    expect(computeSubscriptionTerm(civil('2024-02-29'), 12).endsOn).toEqual(
      civil('2025-02-28'),
    );
    expect(computeSubscriptionTerm(civil('2026-08-31'), 6).endsOn).toEqual(
      civil('2027-02-28'),
    );
  });
});
