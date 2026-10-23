import {
  decideGuestPassBooking,
  decideInvitation,
  decideInviteReward,
} from './guest-pass';

// BKM-014, decisions §5.3: a Guest Pass is one free class in a lifetime, and
// it cannot take the last place in a Session. A normal Booking still can.
describe('decideGuestPassBooking', () => {
  const pass = { placesLeft: 3, guestPassesAlreadyUsed: 0 };

  it('refuses a second guest pass for the same friend', () => {
    expect(
      decideGuestPassBooking({ ...pass, guestPassesAlreadyUsed: 1 }),
    ).toEqual({
      code: 'guest_pass_already_used',
      detail: 'A Guest Pass is once in a lifetime',
    });
  });

  it('refuses the last place in a Session', () => {
    expect(decideGuestPassBooking({ ...pass, placesLeft: 1 })).toEqual({
      code: 'guest_pass_last_place',
      detail: 'A Guest Pass cannot take the last place',
    });
  });

  it('allows the class when a place remains that is not the last', () => {
    expect(decideGuestPassBooking(pass)).toBeNull();
  });
});

// A host invites one friend a calendar month, in America/La_Paz.
describe('decideInvitation', () => {
  const october = new Date('2026-10-15T15:00:00.000Z');

  it('refuses a second invitation in the same calendar month', () => {
    expect(
      decideInvitation({
        now: october,
        earlierInvitations: [new Date('2026-10-01T04:00:00.000Z')],
        invitesPerMonth: 1,
      }),
    ).toEqual({
      code: 'guest_pass_monthly_limit',
      detail: 'A host invites one friend a month',
    });
  });

  it('allows an invitation in the next month', () => {
    expect(
      decideInvitation({
        now: new Date('2026-11-01T04:30:00.000Z'),
        earlierInvitations: [october],
        invitesPerMonth: 1,
      }),
    ).toBeNull();
  });

  it('counts an invitation at 20:30 La Paz on the last day as this month', () => {
    expect(
      decideInvitation({
        now: new Date('2026-11-01T00:30:00.000Z'),
        earlierInvitations: [new Date('2026-10-01T04:30:00.000Z')],
        invitesPerMonth: 1,
      }),
    ).toEqual({
      code: 'guest_pass_monthly_limit',
      detail: 'A host invites one friend a month',
    });
  });
});

// The host's +1 lands once, on her current Subscription, or is owed to her
// next one when she has none.
describe('decideInviteReward', () => {
  it('applies once on the current Subscription', () => {
    expect(
      decideInviteReward({
        alreadyRewarded: false,
        currentSubscriptionId: 'current',
      }),
    ).toEqual({ subscriptionId: 'current', owed: false });
  });

  it('owes the class to the next Subscription when none is current', () => {
    expect(
      decideInviteReward({
        alreadyRewarded: false,
        currentSubscriptionId: null,
      }),
    ).toEqual({ subscriptionId: null, owed: true });
  });

  it('grants nothing more on a retry', () => {
    expect(
      decideInviteReward({
        alreadyRewarded: true,
        currentSubscriptionId: 'current',
      }),
    ).toBeNull();
  });
});
