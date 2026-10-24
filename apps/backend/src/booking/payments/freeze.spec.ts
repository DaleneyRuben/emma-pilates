import { decideFreezeRequest } from './freeze';

const civil = (date: string): Date => new Date(`${date}T00:00:00.000Z`);

const quarterly = {
  subscriptionId: 'subscription-1',
  clientId: 'client-1',
  durationDays: 90,
  endsOn: civil('2026-12-20'),
  today: civil('2026-10-23'),
  existingRequest: null,
};

describe('decideFreezeRequest', () => {
  it('moves the end date by exactly the frozen days', () => {
    expect(
      decideFreezeRequest({
        ...quarterly,
        startsOn: civil('2026-11-01'),
        endsOnRequest: civil('2026-11-10'),
      }),
    ).toEqual({
      allowed: true,
      frozenDays: 10,
      extendedEndsOn: civil('2026-12-30'),
    });
  });

  it('refuses a second request, a Plan under 90 days, more than 15 days, and a start in the past', () => {
    const allowed = {
      ...quarterly,
      startsOn: civil('2026-11-01'),
      endsOnRequest: civil('2026-11-10'),
    };

    expect(
      decideFreezeRequest({ ...allowed, existingRequest: 'refused' }).allowed,
    ).toBe(false);
    expect(decideFreezeRequest({ ...allowed, durationDays: 60 }).allowed).toBe(
      false,
    );
    expect(decideFreezeRequest({ ...allowed, durationDays: 30 }).allowed).toBe(
      false,
    );
    expect(
      decideFreezeRequest({
        ...allowed,
        endsOnRequest: civil('2026-11-16'),
      }).allowed,
    ).toBe(false);
    expect(
      decideFreezeRequest({
        ...allowed,
        startsOn: civil('2026-10-21'),
        endsOnRequest: civil('2026-10-24'),
      }).allowed,
    ).toBe(false);
    expect(decideFreezeRequest({ ...allowed, durationDays: 30 })).toEqual({
      allowed: false,
      code: 'freeze_not_allowed',
    });
  });
});
