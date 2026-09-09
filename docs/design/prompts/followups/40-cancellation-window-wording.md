# Follow-up — Correct Cancellation Window wording

Targets: **standing invariants checklist 30, section 2; Client `05`, `06`,
`09`; Staff `S14`, `S21`; generated handoff `README`**.

The second bullet in checklist 30 incorrectly says that same-day Reschedule
applies **outside** the Cancellation Window. This contradicts
[`booking/CONTEXT.md`](../../../../booking/CONTEXT.md). Treat the following as
the correction to that bullet when using the standing checklist:

- **More than 2 h 30 before the Session starts:** free cancellation returns the
  allowance unit. Changing Sessions means Cancel followed by a new Booking.
- **Inside the 2 h 30 Cancellation Window:** free cancellation is unavailable;
  same-day Reschedule is the fallback, subject to capacity. It moves the
  already-consumed unit and does not consume another one.
- **Administrator cancels the Session:** all affected Bookings receive their
  allowance unit back, including those inside the Cancellation Window.

Verify the target screens and exported handoff against that wording. Regenerate
only content that contradicts it; preserve correct screens, the visual system,
navigation, and all other accepted rules. Do not introduce a cancellation fee or
allow Reschedule outside the window. Include this correction alongside checklist
30 in subsequent design sessions.
