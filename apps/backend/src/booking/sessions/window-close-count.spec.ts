import { bookingsAtClose } from './window-close-count';

const startsAt = new Date('2026-10-23T22:00:00.000Z');

describe('bookings at the window close', () => {
  it('counts a booking cancelled after the close as still booked then', () => {
    expect(
      bookingsAtClose({
        startsAt,
        windowMinutes: 150,
        now: new Date('2026-10-23T21:00:00.000Z'),
        liveCount: 1,
        cancelledAfterClose: 1,
      }),
    ).toBe(2);
  });

  it('counts only live bookings when the sweep runs at the close instant', () => {
    expect(
      bookingsAtClose({
        startsAt,
        windowMinutes: 150,
        now: new Date('2026-10-23T19:30:00.000Z'),
        liveCount: 2,
        cancelledAfterClose: 0,
      }),
    ).toBe(2);
  });
});
