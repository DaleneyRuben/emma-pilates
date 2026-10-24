# Plans last a number of days from a Start Date the client chooses

Status: accepted (2026-10-23)

Plans were built in calendar months (1, 3, 6, 12) starting the day the Payment was confirmed, and a new Plan could be bought only once the current Subscription had expired. The owner's rules for Emma Pilates ([decisions](../../../docs/decisiones-emma-pilates.md), section 2) are different, and they win:

- A Plan's validity is **30, 60, or 90 days**. The end date is the Start Date plus the days minus one, in Bolivia time. `Plan.durationMonths` is deprecated in the contract (ADR-0016) and replaced by `durationDays`.
- The client (or the Assistant) **chooses the Start Date** at purchase: today by default, at most 14 days later (Studio Settings). Before the Opening Date the Opening Date may be chosen even when it is further away, which is the presale (owner, 2026-10-23). Booking is possible only from the Start Date and only once the Payment is confirmed.
- **Early Renewal**: the next Plan can be bought while the current Subscription is effective. If the current one still has classes, the new one starts the day after it ends; if it has none left, extra classes included, the new one starts on the chosen Start Date and the current one ends the day before (owner, 2026-10-23), so a client who used her classes early is not kept waiting. Only one future Subscription may exist.

The Start Date chooser is a row of day chips in JavaScript rather than a native date picker: only 15 dates are possible, and a native module would need new store builds.

Rejected: keeping calendar months (the studio prices by 30-day blocks); starting the Plan at the first class (an open-ended start makes expiry, founders' gaps, and accrued revenue unpredictable); letting renewals queue without limit (one future Subscription covers every real case and keeps the Subscription model simple).
