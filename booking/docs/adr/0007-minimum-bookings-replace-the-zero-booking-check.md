# Cancel a Session below the Minimum Bookings at 3 hours

Status: accepted (2026-10-23); replaces the zero-booking check of BOOK-004

The system used to cancel a Session at 2 hours before its start only if it had no Bookings at all. The owner's rule: a Session is taught only with at least **2** Bookings (configurable in Studio Settings), checked **3 hours** before the start, so the check runs before the 2.5-hour Cancellation Window closes and clients still have time to choose another Session.

Below the minimum the Session is cancelled with the cause `minimum_not_met`; each booked client gets her class back and a push and inbox message naming that day's other Sessions with places; the Waitlist closes; the Trainer is notified and is paid Bs 25 for it (Back Office). An Administrator's cancellation for any other cause pays nothing.

When the Cancellation Window closes, the Session records `bookingsAtWindowClose`, because Trainer pay counts the Bookings held at that moment (no-shows included) and Reschedules inside the window would otherwise move students between Sessions after the fact. This snapshot runs from opening day.
