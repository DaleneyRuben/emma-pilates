# Pilates Studio App

A multi-app system (client mobile app, trainer app, front-desk assistant tablet app) for a Pilates studio to manage class scheduling, subscriptions, and nutritionist evaluations, across one or more branches.

## Language

**Plan**:
A catalog definition of a purchasable offering — e.g. "8-Class Pack" — with its price, date-range length, and fixed class allowance. Every Plan grants a fixed number of classes; there is no unlimited Plan. Not something a client holds directly.
_Avoid_: Membership, package (when referring to the catalog entry)

**Subscription**:
A client's recurring commitment to a Plan, covering a fixed date range (start date to a paid-through end date), with a payment method, status (active/expired/cancelled), and a remaining class allowance carried over from the Plan. A client can only book a Session that falls within that date range and only while allowance remains — each Booking consumes one unit. A successful recurring charge renews the date range and resets the allowance for the next cycle; a failed charge moves the Subscription straight to expired with no grace period. Because booking beyond the end date is never allowed, expiration never orphans a future Booking.
_Avoid_: Membership

**Class Type**:
The catalog definition of a kind of class — e.g. "Reformer Pilates", "Mat Pilates" — with its duration, capacity, and equipment needs.
_Avoid_: Class (when referring to the catalog entry)

**Session**:
A specific scheduled, bookable occurrence of a Class Type, at a given time, with an assigned Trainer and a capacity. Capacity defaults from the Class Type but can be overridden per Session (e.g. reduced due to equipment being out of service). Clients book Sessions, not Class Types.
_Avoid_: Class (when referring to a specific occurrence)

**Booking**:
A client's reserved spot in a Session, with its own status (booked / cancelled / rescheduled). Created by the client or by an Assistant on the client's behalf.
_Avoid_: Reservation, registration

**Attendance**:
A record, set by the Trainer after a Session happens, of whether a Booking's client actually showed up (attended / no-show). Only exists once the Session has occurred. A client's class history is their Bookings with Attendance = attended.
_Avoid_: Check-in

**Reschedule**:
The fallback operation available only once a Booking can no longer be freely cancelled (inside the cancellation window). Moves the Booking to a different same-day Session with capacity. Outside the cancellation window, changing a Booking is just Cancel + a new Booking.
_Avoid_: Change booking, swap

**Evaluation**:
A one-on-one appointment between a client and the Nutritionist, booked against the Nutritionist's published availability. Distinct from a Session: no Class Type, no capacity, single client.
_Avoid_: Appointment, session (when referring to a nutritionist evaluation)

**Availability Block**:
An open time range the Nutritionist publishes (e.g. "Tuesdays 9am–1pm") from which the system auto-generates fixed-length, individually bookable Evaluation slots.
_Avoid_: Schedule, working hours

**Credit**:
A spendable balance on a client's account, earned through Referrals, applied automatically to future Subscription charges.
_Avoid_: Discount, coupon, balance

**Referral**:
A link between a referring Client and a referred Client, established when the referred Client signs up using the referrer's code. Grants the referrer a Credit once the referred Client's first Payment succeeds — not at signup.
_Avoid_: Invite

**Branch**:
A physical studio location. Sessions, Evaluations/Availability Blocks, and staff assignments are scoped to a Branch. Plans and Subscriptions are studio-wide and not tied to a single Branch — a client's Subscription grants access at any Branch. (See [ADR-0001](./docs/adr/0001-model-branch-as-first-class-entity.md).)
_Avoid_: Location, studio (when referring to a single site), site

**Client**:
A studio customer who holds Subscriptions and creates Bookings/Evaluations. Has no home or default Branch — can book at any Branch. Account may be self-registered or created by an Assistant with a temporary password.
_Avoid_: Customer, member, user

**Staff Member**:
A person working for the studio, with exactly one Role (Trainer / Nutritionist / Assistant / Administrator) and a set of assigned Branches (all, implicitly, for Administrator).
_Avoid_: User, employee, personal

**Payment**:
A record of money received for a Plan, with a method (automated / cash). Automated Payments are created by a billing job charging a stored payment method; cash Payments are created manually by an Assistant. Either renews the Subscription's date range and resets its class allowance identically.
_Avoid_: Charge, transaction

**Promotion**:
Admin-managed carousel content (image, headline, description, display date range) shown to clients. Purely informational — carries no automatic pricing or discount effect.
_Avoid_: Offer, deal, coupon
