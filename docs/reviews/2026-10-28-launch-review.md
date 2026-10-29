# Review of the launch work (PRs #155–#224)

Reviewed on 2026-10-28 against `main` at `0623829c`, comparing the changes since `61e18248` with `docs/decisiones-emma-pilates.md` and the backlog's acceptance criteria. The review was split into seven areas, each read end to end. I re-checked the most serious findings in the code myself (marked ✓). Nothing was changed.

## Summary

The structure is solid:

- Authorization is tight. The Coordinator never sees an amount, and the matrix test covers every endpoint.
- Settings are versioned and audited.
- The "AI" narrated report sends nothing outside the system: it is a local template.
- The Client app added no native modules.
- Store and production releases stay manual.

There are many rule and money bugs, though. They mostly come from items built in parallel that never met: founders × gift class × campaigns, the freeze × the waitlist, paid evaluations × rejection/cancellation, and voids × invoices × closure. A second group sits in finance and payroll.

## High: fix before opening

| # | Area | Problem | Where | Fix |
| --- | --- | --- | --- | --- |
| 1 ✓ | Founders | **Every founder also gets the gift class.** The gift is decided before the founder place exists on the same first payment. | `booking/payments/prisma-payment-commands.ts:445-457` vs `:565`, `:1084` | Grant the founder place first, or pass its result into the gift decision. |
| 2 | Founders | **Campaigns reach founders**, plus guest passes, Courtesy Access, and store-review holders. | `booking/payments/prisma-campaign-grant.ts:22-45` | Exclude active founders and any non-real Subscription (courtesy, hidden, Bs 0). |
| 3 | Founders | **The 7-day gap is computed wrong, both ways.** <br>(a) Off by one: a 7-day gap loses the membership. <br>(b) A Client who buys with a future start date: the old Subscription expires, the job only looks at ACTIVE ones, so the gap is never seen and she keeps 15 % forever. | `founder-membership.ts:58-66`, `founder-membership-job.ts:25-48,83-86` | Gap = next start − (end + 1). Read every non-voided Subscription. Also check the gap when the sale is confirmed. |
| 4 ✓ | Money | **A founder paying by QR at the front desk pays list price.** | `booking/payments/front-desk-transfer.ts:187-300` | Price with `priceFounderSale` and store the discount, as the Client transfer does. |
| 5 | Money | **The front-desk QR expires the current Plan while the receipt is still pending.** If it is then rejected, she has no plan and loses her extra classes. | `front-desk-transfer.ts:139-171` | Use the same eligibility and Start Date allocation as the Client path, and end the plan only at confirmation. |
| 6 ✓ | Money | **A transfer confirmed on a later day than its Start Date cannot be approved** (400 `start_date_out_of_window`). Buying at 21:00 with «Hoy» and reviewing the next morning is enough. | `prisma-payment-commands.ts:1012-1037` → `start-date.ts:28-41` | When confirming, do not check the window against today: move a past start to today and audit it. |
| 7 ✓ | Nutrition | **Rejecting a paid-Evaluation transfer gives a 500** (no `EVALUATION` branch; `purchaseIntentId!` is null). | `prisma-payment-commands.ts:1121-1180` | Add the evaluation branch: reject and cancel the Evaluation. |
| 8 | Nutrition | **Cancelling a pending paid Evaluation leaves its payment pending forever.** The Client can then never buy another plan, and confirming it books income and the Bs 50 cost on a cancelled Evaluation. | `evaluations/prisma-evaluation-commands.ts:1539-1674` | Reject the payment in the same cancellation, and refuse a confirm when the Evaluation is not booked. |
| 9 | Privacy | **Closing an account fails** when the Client has a voided sale with invoice data (the trigger protects voided rows). | `account-closure/closure-personal-data-steps.ts:64-67` + `protect_payment` | A migration that allows erasing the invoice fields on voided rows, plus a test. |
| 10 ✓ | Finance | **«Resultado» subtracts no salaries.** Trainer pay, the Coordinator, and reception are left out, so it is overstated by about Bs 12,800 a month. | `back-office/finance/prisma-finance.ts:53-82`, `monthly-result.ts` | Subtract the month's `SalaryPayment` total as its own line. |
| 11 | Payroll | **One approval can create two Salary Payments.** <br>• A double approval. <br>• An approval racing the hourly re-draft, which soft-deletes the approved statement and makes another draft. | `back-office/payroll/prisma-pay-statements.ts:147-291` | Conditional update on `state = DRAFT` (check the count), or Serializable with a lock, in both paths. |
| 12 ✓ | Finance | **The accrued-revenue report is wrong:** <br>• «Diferido» never empties (capped at the plan's first month). <br>• A payment approved on the 1st counts in two months (`<=`). <br>• A plan with start = end makes the whole report NaN. <br>• The span is one day short. <br>• Evaluations are missing from «Caja». | `studio/accrue-revenue.ts:41-77`, `prisma-revenue-report.ts` | Rewrite the calculation: inclusive span guarded against 0, `<` for the month end, deferred = amount × days left / span. |
| 13 | Booking | **One queued Client with spent extra classes blocks cancellations and bookings for the whole Session** (409 for everyone else). A spent gift still counts as "has extra". | `commands/eligible-subscription.ts:24-32`, `waitlist-promotion.ts:98-107` | Use the net sum of adjustments, and skip the entry instead of throwing. |
| 14 | Booking | **Renewal ignores extra classes:** a Client with campaign or gift classes left counts as exhausted, the current plan is ended early, and she loses them. | `payments/purchase-eligibility.ts:31-40`, `early-renewal.ts:39` | Include the extra sum in the effectiveness check. |
| 15 | Freeze | **The freeze is not enforced on:** <br>• joining the waitlist, or being promoted from it, inside the freeze; <br>• rescheduling into the freeze or before the Start Date. | `waitlist-promotion.ts`, `join-waitlist`, `reschedule-booking.ts:80-158` | Run the same freeze and Start Date checks as `createBooking`, and close waitlist entries on approval. |
| 16 | Freeze | **A late approval refunds classes already taught:** asking 1–10 and approving on the 5th cancels and returns the 1st–4th. | `payments/prisma-freeze.ts:263-272`, `75-102` | Refuse an approval when the start is already past, or freeze only from today. |
| 17 | Guest pass | **A friend's guest pass behaves like a current plan:** when she buys, her paid plan is pushed about 30 days. | `open-guest-pass.ts:124-137` + `early-renewal.ts` | Exclude courtesy and hidden Subscriptions from the renewal logic, or end the pass when she buys. |
| 18 | Coordinator pay | **The renewal rate counts guest passes and Courtesy Access**, and can lose the Bs 400 bonus. «Renewed» also uses the next plan's start, not the purchase date the decisions doc says. | `back-office/payroll/coordinator-pay-facts.ts:48-98` | Count real Plan payments only, and compare the purchase date with end + 7. |

## Medium

**Plans and booking**
- A refunded extra-funded class goes back to the base pool. It can break the `remaining <= original` CHECK and give a 500, including inside the minimum-bookings worker (`prisma-booking-commands.ts:293-297,493-500`).
- Rescheduling an extra-funded class counts against the weekly cap (`prisma-booking-commands.ts:578-623`).
- Two cases give a 500 where they should give a clear error:
  - renewing an exhausted plan on its own start day;
  - Courtesy Access with an end date before its start.
- The renewal reminder goes to Clients who already renewed and to courtesy plans (`subscription-reminder-job.ts:20-26`).

**Freeze**
- The freeze window is not bounded by the Subscription's term and ignores a queued renewal (`prisma-freeze.ts:131-158`).
- A double approval can extend the plan twice (`:224-311`).
- The cancellation window runs on UTC midnight instead of La Paz (`:80-82`).

**Guest pass**
- A cancelled guest-pass class becomes a base class and skips the last-place rule.
- Anyone can burn a host's monthly invite before verifying their email, and a real friend's registration with the code then fails with 409.

**Money**
- Voiding does not undo:
  - the founder place;
  - the gift class or the invite reward;
  - the included Evaluations;
  - the Client's waitlist entries.
- The Bs 50 Nutritionist cost counts cancelled Evaluations (`evaluations/nutritionist-cost.ts`).
- Evaluation transfers:
  - confirming one writes no audit record and sends no push;
  - there is no receipt;
  - a paid Evaluation can be sold to a Client whose plan is exhausted.
- AW28 and the CSV label Evaluation payments with the plan name, and bucket by `submittedAt` while the reports use `decidedAt`.
- The cash close drops voided cash sales, even though no money left the drawer.

**Finance and payroll**
- Finanzas and payroll cut months at UTC midnight. Reporte uses La Paz, so the two disagree for sales after 20:00 on the last day of the month.
- A statement can be approved before its month ends, and the rest of the month is never paid.
- A voided first payment lets the same Client generate a second commission later.
- Coordinator pay is drafted for the oldest Coordinator, even a deactivated one, and never for a second Coordinator.
- KPIs, recommendations, and the narrative count cancelled and future Sessions as taught, and count guests, courtesy, and voided plans as Clients.
- Renewal is defined two ways (KPI vs bonus).
- The previous month is never finalized.
- The simulator uses one price for both the Client price and Trainer pay, and ignores the Bs 8 per extra student.
- Store-review rows have no exclusion in finance or payroll (needed for REL-016).

**Authorization**
- When the Administrator «sees the app as» the Coordinator, or acts as the Assistant on a front-desk transfer, the audit records the impersonated person and no `impersonationId` (ADR-0100).

**Worker**
- The class reminder opens one Serializable transaction per booking every minute (about 800 queries a minute at 200 bookings), and the sweeps have no overlap guard.
- First 90 days:
  - it reads all history every hour;
  - it counts lifetime bookings instead of those in the first 15 or 30 days;
  - after downtime it sends every milestone at once.
- Date-based pushes (90 days, founder loss, expiry) go out between 00:00 and 01:00 and are timestamped 20:00 the previous day.
- The window-close snapshot counts wrong when the worker was down.
- One failing Session stops the whole minimum-bookings sweep.
- The hourly pay re-draft rewrites every line every hour: about 48,000 soft-deleted rows a day on Aiven Free.

**Delivery**
- The MOB-072 crash can recur: an OTA can reach binaries without the native modules it needs. Use the `fingerprint` runtime policy or block the OTA when it changes.
- The production OTA guard can never pass (git notes are not fetched), and the preview channel reaches no device.
- Android: every CI build would upload the same `versionCode`.
- Staff app: `expo-image-picker` has no configuration, so the permission prompts are generic English strings, it asks for the microphone, and Apple may reject that.
- The cash close spins forever if the profile or branch request fails, and it shows rounded amounts.

## Low

- Files far over the 400-line limit:
  - `prisma-evaluation-commands.ts`: 1,835 lines.
  - `prisma-payment-commands.ts`: 1,430 lines.
  - `prisma-booking-commands.ts`: 947 lines.
- The weekly-cap logic is duplicated in three places.
- Two ADRs are numbered 0101.
- Dead code:
  - a copy of `InvoiceDataCard` in the Staff app;
  - `renewalStartsOn`, never used;
  - a P2002 catch that does nothing.
- Two booking-rejection copy maps exist in the Client app.
- A CI shard runs one spec twice.
- The OTA message is interpolated into a shell command.
- Founder numbering uses `count + 1` and would break if a membership were ever soft-deleted.
- Inicio offline hides the banner when only one query fails.
- Stale comments.

## Decisions the owner needs to make

1. **Founder's first plan:** today she pays list price on her first plan and gets 15 % from the second one. The decisions doc says «15 % en cualquier plan». Should the first one get 15 % too?
2. **Cancelled guest-pass class:** is it lost, or can she book another one?
3. **What a void reverses:** the founder place, the gift, the invite reward, the included Evaluations?
4. **Cash close and voids:** should a voided cash sale stay in «Esperado», given no money is returned?
5. **«Renovó» for the bonus:** the doc says purchase date, the code uses the next plan's start date. Confirm the doc's reading.
6. **Coordinator and «horarios de personal»:** may she assign a Trainer's branches?

## Checked and found correct

- **Authorization:**
  - the matrix test covers every endpoint on main;
  - no endpoint the Coordinator can read returns an amount;
  - a Trainer sees only her own pay;
  - Studio Settings are versioned and audited, and the public endpoint exposes nothing private;
  - feedback is idempotent, rate-limited, and free of personal data in the pushes.
- **Formulas:**
  - Trainer pay (65/+8/25/10 %) and Coordinator pay (3,500/50/80/400, targets by month of operation);
  - the budget (21,175) and the break-even (~36,270).
- **Plans by days:** the term (start + days − 1), the Start Date window and presale, and only one future Subscription.
- **Weekly cap:** Monday to Sunday in La Paz, applied the same way to the Client, the Assistant, and the waitlist.
- **Minimum bookings:** locked, idempotent, and the snapshot runs before the check.
- **BE-027:** promotes the waitlist when capacity grows and audits attendance corrections.
- **Money:** voids are Serializable, Administrator-only, and protected by a trigger.
- **Cash close:** one a day, La Paz day, immutable.
- **Founder places:** the 41st Client gets none, and concurrent confirms are covered by a test.
- **Credit removal:** no client-facing field was removed from the contract.
- **AI:** the narrated report calls no external provider, so no data leaves the system.
- **Apps:**
  - no hard-coded rule copy is back;
  - every error code has its own message;
  - no app reads a deprecated field;
  - no app file is over 400 lines.
- **Releases:** store and production deploys stay manual and gated.
