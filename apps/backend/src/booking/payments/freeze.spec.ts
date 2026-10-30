import { countedFreezeRequest, decideFreezeRequest } from './freeze';

// A Bolivia calendar day, and 15:00 that afternoon in La Paz.
const civil = (date: string): Date => new Date(`${date}T00:00:00.000-04:00`);
const afternoon = (date: string): Date =>
  new Date(`${date}T15:00:00.000-04:00`);

const quarterly = {
  subscriptionId: 'subscription-1',
  clientId: 'client-1',
  durationDays: 90,
  endsOn: civil('2026-12-20'),
  today: afternoon('2026-10-23'),
  existingRequest: null,
};

describe('countedFreezeRequest', () => {
  it('counts a requested or an approved Freeze and ignores a refusal', () => {
    expect(countedFreezeRequest([])).toBeNull();
    expect(countedFreezeRequest([{ state: 'REFUSED' }])).toBeNull();
    expect(countedFreezeRequest([{ state: 'requested' }])).toBe('requested');
    expect(countedFreezeRequest([{ state: 'APPROVED' }])).toBe('approved');
    expect(
      countedFreezeRequest([{ state: 'refused' }, { state: 'requested' }]),
    ).toBe('requested');
  });
});

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
    ).toBe(true);
    expect(
      decideFreezeRequest({ ...allowed, existingRequest: 'requested' }).allowed,
    ).toBe(false);
    expect(
      decideFreezeRequest({ ...allowed, existingRequest: 'approved' }).allowed,
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

describe('decideFreezeRequest bounds', () => {
  it('allows a request that starts today', () => {
    expect(
      decideFreezeRequest({
        subscriptionId: 'subscription-1',
        clientId: 'client-1',
        durationDays: 90,
        endsOn: civil('2026-12-20'),
        today: afternoon('2026-10-05'),
        startsOn: civil('2026-10-05'),
        endsOnRequest: civil('2026-10-10'),
        existingRequest: null,
        subscriptionStartsOn: civil('2026-09-22'),
        renewalStartsOn: null,
      }).allowed,
    ).toBe(true);
  });

  it('approves a freeze that starts today so a morning class can stay', () => {
    expect(
      decideFreezeRequest({
        subscriptionId: 'subscription-1',
        clientId: 'client-1',
        durationDays: 90,
        endsOn: civil('2026-12-20'),
        today: afternoon('2026-10-05'),
        startsOn: civil('2026-10-05'),
        endsOnRequest: civil('2026-10-10'),
        existingRequest: null,
        subscriptionStartsOn: civil('2026-09-22'),
        renewalStartsOn: null,
        approving: true,
      }).allowed,
    ).toBe(true);
  });

  it('approves a freeze that starts tomorrow', () => {
    expect(
      decideFreezeRequest({
        subscriptionId: 'subscription-1',
        clientId: 'client-1',
        durationDays: 90,
        endsOn: civil('2026-12-20'),
        today: afternoon('2026-10-29'),
        startsOn: civil('2026-10-30'),
        endsOnRequest: civil('2026-11-01'),
        existingRequest: null,
        subscriptionStartsOn: civil('2026-09-22'),
        renewalStartsOn: null,
        approving: true,
      }).allowed,
    ).toBe(true);
  });

  it('refuses a start already past with its own code', () => {
    expect(
      decideFreezeRequest({
        subscriptionId: 'subscription-1',
        clientId: 'client-1',
        durationDays: 90,
        endsOn: civil('2026-12-20'),
        today: afternoon('2026-10-05'),
        startsOn: civil('2026-10-01'),
        endsOnRequest: civil('2026-10-10'),
        existingRequest: null,
        subscriptionStartsOn: civil('2026-09-22'),
        renewalStartsOn: null,
      }),
    ).toEqual({ allowed: false, code: 'freeze_start_in_past' });
  });

  it('refuses a window outside the Subscription term', () => {
    expect(
      decideFreezeRequest({
        subscriptionId: 'subscription-1',
        clientId: 'client-1',
        durationDays: 90,
        endsOn: civil('2026-12-20'),
        today: afternoon('2026-10-23'),
        startsOn: civil('2026-12-15'),
        endsOnRequest: civil('2026-12-24'),
        existingRequest: null,
        subscriptionStartsOn: civil('2026-09-22'),
        renewalStartsOn: null,
      }),
    ).toEqual({ allowed: false, code: 'freeze_outside_term' });
  });

  it('refuses a window that would overlap a queued renewal', () => {
    expect(
      decideFreezeRequest({
        subscriptionId: 'subscription-1',
        clientId: 'client-1',
        durationDays: 90,
        endsOn: civil('2026-11-20'),
        today: afternoon('2026-10-23'),
        startsOn: civil('2026-11-15'),
        endsOnRequest: civil('2026-11-20'),
        existingRequest: null,
        subscriptionStartsOn: civil('2026-09-22'),
        renewalStartsOn: civil('2026-11-21'),
      }),
    ).toEqual({ allowed: false, code: 'freeze_outside_term' });
  });

  it('refuses a mid-term window whose extension would overlap a queued renewal', () => {
    expect(
      decideFreezeRequest({
        subscriptionId: 'subscription-1',
        clientId: 'client-1',
        durationDays: 90,
        endsOn: civil('2026-12-20'),
        today: afternoon('2026-11-01'),
        startsOn: civil('2026-11-11'),
        endsOnRequest: civil('2026-11-20'),
        existingRequest: null,
        subscriptionStartsOn: civil('2026-09-22'),
        renewalStartsOn: civil('2026-12-21'),
      }),
    ).toEqual({ allowed: false, code: 'freeze_outside_term' });
  });
});
