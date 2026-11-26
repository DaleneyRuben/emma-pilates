import { invitationOf } from './referral-invitation';

// BKM-014 and the testing session (#20 + #22): a friend's invitation as
// «Tus invitadas» shows it, read from the Guest Pass she received, if any.
describe("a friend's invitation", () => {
  it('has no free class when no Guest Pass was opened for her', () => {
    expect(invitationOf(null)).toEqual({
      invitationStatus: 'registered',
      freeClass: false,
    });
  });

  it.each([
    [{ bookingId: null, rewardedAt: null, rewardOwed: false }, 'registered'],
    [{ bookingId: 'b', rewardedAt: null, rewardOwed: false }, 'class_booked'],
    [{ bookingId: 'b', rewardedAt: new Date(), rewardOwed: false }, 'bought'],
    [{ bookingId: 'b', rewardedAt: null, rewardOwed: true }, 'bought'],
  ] as const)('reads %o as %s, with her free class', (pass, status) => {
    expect(invitationOf(pass)).toEqual({
      invitationStatus: status,
      freeClass: true,
    });
  });
});
