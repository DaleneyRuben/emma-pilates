# The next Plan chooses its Start Date, up to four weeks after the current one ends

Status: accepted (2026-11-06)

[ADR-0005](./0005-validity-in-days-with-a-chosen-start-date.md) made an Early Renewal with classes left start the day after the current Subscription ends, with no date to choose. During the second walkthrough (2026-11-06, Paso 9, n.º 35) the owner decided that the next Plan always chooses its Start Date too:

- **Window.** While the current Subscription still has classes (base, extra, or a booked Session ahead), the next Plan starts on a chosen day from the day after the current one ends through **28 days after that end**, inclusive. Without a chosen date it starts the day after the end, as before, so builds that send no date keep working. A date after the window is refused with `start_date_out_of_window`; a date before it is read as its first day, as ADR-0005 ignored it, because older builds send today. The Studio Settings Start Date limit (14 days from today) does not apply to this case: the window hangs from the current end, not from today.
- **No classes left** keeps ADR-0005's rule for a start on or before the current end: the chosen Start Date sits in the usual window from today, and the current Subscription ends the day before. A start after the current end, inside the window above, queues behind it instead, so a transfer bought ahead still confirms on its date after the current Plan has spent its classes.
- It applies to every sale that can be an Early Renewal: the Assistant's cash sale and front-desk QR («Registrar pago»), and the Client's own purchase intent and transfer. The confirmation of a transfer keeps the date it was sold with (H6 still moves a late-reviewed start to the day it is confirmed).

**The Founder place survives an advance purchase** (owner, 2026-11-06). [ADR-0008](./0008-founder-membership.md) loses the place when more than 7 days pass between one Subscription's real end and the next Start Date. A next Plan **sold while the previous Subscription had not yet ended** (sale day on or before its real end) whose Start Date falls inside the window above never counts as a gap, however many of those days are uncovered. The sale day, in Bolivia time, is the day the Client committed to the Purchase Intent, else the day the Payment was recorded, so a transfer whose receipt arrives the next day, or that is reviewed late, is judged on the day it was bought. The nightly founder job applies the same exemption to a queued Subscription or a pending transfer. Voiding or rejecting that sale removes the next start, and the ordinary gap rule applies again from the real end.

A Freeze's extension must still end before the queued Plan's Start Date, which now may leave room for it; a transfer still in review for the next Plan counts as queued, or the Freeze could make it unconfirmable.

The 28 days are a rule in code (`nextPlanStartWindowDays`), not a Studio Setting: making it configurable needs a migration, and the owner gave one number. If she wants to tune it, it moves to Studio Settings with ADR-0101.

Rejected: keeping the fixed next-day start (the owner asked for the choice); letting the window start from today (a Plan in force would then overlap the next one); losing the Founder place after 7 uncovered days even when bought ahead (the owner said a Client who paid in advance keeps it).
