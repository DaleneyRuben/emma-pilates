# Cap weekly Bookings on long Plans and keep extra classes apart

Status: accepted (2026-10-23)

A class allowance used to be a single pool spendable at any pace. The owner caps the 60- and 90-day Plans so that a client spreads her classes over the Plan: 3 Bookings a week on the Plans of 8 classes a month (16 and 24 classes), 4 on those of 12 a month (24 and 36 classes); 30-day Plans have no cap. The week is Monday to Sunday in Bolivia time.

Extra classes are recorded as **Allowance Adjustments** (`gift_new_client`, `invite_converted`, `campaign`, `courtesy`, `class_return`) with their author, never by editing the Plan's allowance or the Payment, so the origin of every class stays visible and reports can tell bought classes from given ones. They are spent after the base allowance, and they do not count toward the cap: past it, a Booking uses an extra class if one is left.

The cap applies to every way a Booking is made. On the Waitlist the owner chose (2026-10-23) that a client at her cap cannot join that week's Waitlist unless she has an extra class left, and promotion skips — but keeps queued — a client who reached her cap after joining.

Only an Administrator makes courtesy, class-return, and Campaign adjustments. The Gift Class (+1 on the first real Subscription of a Client's life, not for founders) and the invitation reward are applied by the system.
