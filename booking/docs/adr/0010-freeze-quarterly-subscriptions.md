# Let a client freeze a quarterly Subscription once

Status: accepted (2026-10-23)

A Subscription on a Plan of 90 days or more may be frozen once, for up to 15 days, never starting in the past, and only inside its current term. Once counts a requested or an approved Freeze. The owner decided (2026-10-29) that a refusal does not spend it: she can ask again with new dates. A queued renewal caps the window so the extension cannot reach that renewal's Start Date. The client asks from Mi plan with dates and a reason; an Administrator approves or refuses it, prompted by a push, and the client is told. An approval whose start is already a past Bolivia date is refused and changes nothing. During the Freeze she cannot book, join a Waitlist, be promoted from one, or reschedule into it. Bookings and Waitlist entries already inside it are cancelled with their class returned, and the end date moves by exactly the frozen days. A Waitlist entry closed by a Freeze is stored as `session_cancelled`. That reason is untrue — the Session was not cancelled — and the deciding Administrator is not stored on the entry. Nothing reads the reason today. A later item may add a `frozen` reason. A founder keeps her membership through a Freeze.

Approval stays with the Administrator because a Freeze changes what the studio owes; letting clients freeze alone would make the rule a right to extend.
