import { decideGuestPassBooking } from './guest-pass';

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
