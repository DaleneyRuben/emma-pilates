import { isBeyondBookingWindow } from '../studio-settings/studio-settings';

// FIX-026: book, join a Waitlist, and reschedule refuse a Session past the
// Booking Window, for the Client and for Staff acting for her. The owner's
// Session cancellation does not read it. A caller without the setting (an
// older spec double) is not limited.
export const assertInsideBookingWindow = async (
  startsAt: Date,
  now: Date,
  bookingWindowDays: (() => Promise<number>) | undefined,
): Promise<void> => {
  if (bookingWindowDays === undefined) return;
  if (isBeyondBookingWindow(startsAt, now, await bookingWindowDays())) {
    throw new Error('Session is beyond the Booking Window');
  }
};
