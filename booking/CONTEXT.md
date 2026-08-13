# Booking & Membership

Class scheduling, subscriptions, and nutritionist evaluations for clients, trainers, and assistants at a Pilates studio, across one or more branches. Covers the client mobile app and the staff mobile app (shared by Trainers, Assistants, Administrators, and the Nutritionist, routed by Role).

## Language

**Plan**:
A catalog definition of a purchasable offering — e.g. "8-Class Pack" — with its price, a duration (1, 3, 6, or 12 months, the longer ones priced at a discount), and a fixed class allowance. Every Plan grants a fixed number of classes; there is no unlimited Plan. That allowance is a single pool covering the whole date range rather than a monthly ration: a client on a 6-month Plan may spend it at any pace, including all of it in the first month. Not something a client holds directly.
_Avoid_: Membership, package (when referring to the catalog entry)

**Subscription**:
A client's access to a Plan over a fixed date range (start date to a paid-through end date), with a status (active/expired) and a remaining class allowance carried over from the Plan. A client can only book a Session that falls within that date range and only while allowance remains — each Booking consumes one unit. A Subscription is active while it is inside its date range and either has allowance left or still has booked Sessions ahead of it; it expires when the date range ends, or when allowance is at zero and no booked Session remains — classes still unspent at the end date are lost. Cancelling one of those last Bookings returns its unit to the same Subscription, which is still the client's current one, so a returned class is never stranded. Nothing renews on its own, and a client holds one Subscription at a time: a new Plan can only be bought once the current one has expired, and the new date range begins only when a Payment is confirmed. Because booking beyond the end date is never allowed, expiration never orphans a future Booking. The client is sent a renewal reminder 3 days before the paid-through end date.
_Avoid_: Membership

**Class Type**:
The catalog definition of a kind of class — e.g. "Reformer Pilates", "Mat Pilates" — with its duration, capacity, and equipment needs.
_Avoid_: Class (when referring to the catalog entry)

**Session**:
A specific scheduled, bookable occurrence of a Class Type, at a given time, with an assigned Trainer and a capacity. Capacity defaults from the Class Type but can be overridden per Session (e.g. reduced due to equipment being out of service). Clients book Sessions, not Class Types. A Session is cancelled automatically by the system via a one-time check at 2 hours before its start time: if it has zero Bookings at that point, it's cancelled — the Trainer does not cancel it manually, and a Session that drops to zero Bookings earlier stays normally bookable until that check runs. An Administrator can also cancel a Session that has Bookings, as a last resort when no substitute Trainer can cover it: every Booking on it is cancelled, each client's allowance unit is refunded even inside the Cancellation Window, and the clients are notified.
_Avoid_: Class (when referring to a specific occurrence)

**Booking**:
A client's reserved spot in a Session, with its own status (booked / cancelled / rescheduled). Created by the client or by an Assistant on the client's behalf. Consumes one unit of the Subscription's allowance when created; Cancelling refunds that unit back to the allowance, while Rescheduling does not — it's the same already-consumed unit moved to a different Session.
_Avoid_: Reservation, registration

**Waitlist**:
The ordered queue of clients waiting for a spot in a Session that is at capacity. Joining consumes no allowance, so a client can sit on several Waitlists at once. When a spot frees, the first eligible client in the queue is promoted automatically into a real Booking — consuming one allowance unit at that moment — and notified. A client is skipped, but stays queued, if they can't take the spot: no allowance left, an expired Subscription, or an existing Booking that overlaps the Session's time at any Branch. Promotion stops once the Session enters its Cancellation Window, so a client is never added to a Session they can no longer cancel out of; a spot freed inside the window simply goes unfilled. A Waitlist belongs to a Session only — Evaluations have none, and a freed Evaluation slot just becomes bookable again.
_Avoid_: Queue, standby, wait list

**Attendance**:
A record, set by the Trainer after a Session happens, of whether a Booking's client actually showed up (attended / no-show). Only exists once the Session has occurred. A client's class history is their Bookings with Attendance = attended. Purely a reporting record — it has no effect on the Subscription or its allowance, since the class was already consumed when the Booking was created.
_Avoid_: Check-in

**Cancellation Window**:
The 2.5-hour period immediately before a Session's start time. Inside it, a Booking can no longer be freely cancelled — Reschedule is the only option left. Outside it (more than 2.5 hours before start), a client changes plans via Cancel + a new Booking instead.
_Avoid_: Grace period, cutoff, deadline

**Reschedule**:
The fallback operation available only once a Booking can no longer be freely cancelled (inside the Cancellation Window). Moves the Booking to a different same-day Session with capacity. Outside the Cancellation Window, changing a Booking is just Cancel + a new Booking.
_Avoid_: Change booking, swap

**Evaluation**:
A one-on-one appointment between a client and the Nutritionist, booked against the Nutritionist's published availability. Distinct from a Session: no Class Type, no capacity, single client. Free to any client with an active Subscription — it costs no money and consumes no class allowance — but limited to one per calendar month, unused months not carrying over, and not bookable at all without an active Subscription. The client is reminded twice: 1 day before, and again 1 hour before.
_Avoid_: Appointment, session (when referring to a nutritionist evaluation)

**Availability Block**:
An open time range the Nutritionist publishes (e.g. "Tuesdays 9am–1pm") from which the system auto-generates fixed-length, individually bookable Evaluation slots.
_Avoid_: Schedule, working hours

**Credit**:
A spendable money balance on a client's account, earned through Referrals. It comes off the amount the client is asked to pay for their next Plan — that reduced figure is the one printed beside the QR code for them to type into their bank app — and is spent when the Payment is confirmed. If that Payment is never confirmed, the Credit returns to the balance.
_Avoid_: Discount, coupon, balance

**Referral**:
A link between a referring Client and a referred Client, established when the referred Client signs up using the referrer's code. Grants the referrer a Credit once the referred Client's first Payment is confirmed — not at signup, and not while it sits pending.
_Avoid_: Invite

**Branch**:
A physical studio location with a single studio room, so two Sessions at the same Branch never overlap in time — a Branch's schedule is one class after another. Sessions, Evaluations/Availability Blocks, and staff assignments are scoped to a Branch. Plans and Subscriptions are studio-wide and not tied to a single Branch — a client's Subscription grants access at any Branch. (See [ADR-0001](./docs/adr/0001-model-branch-as-first-class-entity.md).)
_Avoid_: Location, studio (when referring to a single site), site

**Client**:
A studio customer who holds Subscriptions and creates Bookings/Evaluations. Has no home or default Branch — can book at any Branch. Account may be self-registered or created by an Assistant with a temporary password.
_Avoid_: Customer, member, user

**Staff Member**:
A person working for the studio, with exactly one Role (Trainer / Nutritionist / Assistant / Administrator) and a set of assigned Branches (all, implicitly, for Administrator). The Roles divide on one line: Assistants act on behalf of clients — Bookings, cash Payments, account creation — at their assigned Branches, while Administrators act on the schedule and on staff — creating Sessions, assigning and swapping Trainers, cancelling a Session that has Bookings — across every Branch. Trainers record Attendance for their own Sessions; the Nutritionist publishes Availability Blocks and holds Evaluations.
_Avoid_: User, employee, personal

**Payment**:
A record of money received for a Plan, with a method (transfer / cash), a status (pending / confirmed / rejected), and the amount the client was asked to pay — the Plan's price less any Credit — so a discounted Payment can be told apart from a short one. A transfer Payment is raised by the client themselves, by marking in the app that they've paid against the studio's QR code; the client attaches a screenshot of their transfer receipt as proof, and it stays pending, granting nothing, until an Administrator checks that screenshot against the money in the bank. Confirming it is what starts or extends the Subscription's date range and resets its class allowance. If the receipt doesn't hold up — amount doesn't match, no matching transfer found — the Administrator rejects it instead, with a short reason; the client sees why and must raise a new transfer Payment with a corrected receipt, the rejected one now settled and final. A push notification tells the Administrator one is waiting so the client isn't kept out of a class they've paid for. A cash Payment is recorded by an Assistant with the money in hand, and is confirmed the moment they record it — cash Payments are never rejected.
_Avoid_: Charge, transaction, pendiente / completado (UI labels for pending / confirmed)

**Promotion**:
Admin-managed carousel content (image, headline, description, display date range) shown to clients. Purely informational — carries no automatic pricing or discount effect.
_Avoid_: Offer, deal, coupon
