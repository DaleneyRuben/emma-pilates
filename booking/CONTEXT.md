# Booking & Membership

Class scheduling, subscriptions, and nutritionist evaluations for clients, trainers, and assistants at a Pilates studio, across one or more branches. Covers the client mobile app and the staff mobile app (shared by Trainers, Assistants, the Coordinator, Administrators, and the Nutritionist, routed by Role).

## Language

**Plan**:
A catalog definition of a purchasable offering — e.g. «8 clases» — with its price, a validity in days (30, 60, or 90), a fixed class allowance, and an optional Weekly Cap ([ADR-0005](./docs/adr/0005-validity-in-days-with-a-chosen-start-date.md)). Every Plan grants a fixed number of classes; there is no unlimited Plan. The price is the same whichever Class Type the classes are spent on. A Plan is non-transferable and non-refundable. A hidden Plan never appears in the Client or Assistant catalog; only an Administrator grants one, and only a hidden Plan may cost Bs 0 (Courtesy Access). Not something a client holds directly.
_Avoid_: Membership, package (when referring to the catalog entry), monthly plan

**Subscription**:
A client's access to a Plan over a fixed date range — from its Start Date to its end date, the Start Date plus the Plan's validity in days minus one — with a status (active/expired), a remaining class allowance carried over from the Plan, and any extra classes from Allowance Adjustments. A client can book only a Session on or after the Start Date and inside the date range, only once the Payment is confirmed, and only while allowance remains — each Booking consumes one unit, base allowance first. A Subscription is active while it is inside its date range and either has allowance left or still has booked Sessions ahead of it; it expires when the date range ends, or when allowance is at zero and no booked Session remains — classes still unspent at the end date are lost. Cancelling one of those last Bookings returns its unit to the same Subscription, so a returned class is never stranded. A Freeze moves the end date. A client may hold one future Subscription bought through Early Renewal. The client is sent a renewal reminder 3 days before the end date.
_Avoid_: Membership

**Start Date**:
The first day of a Subscription, chosen by the client (or the Assistant) at purchase: today by default, at most 14 days later (Studio Settings). Before the studio's Opening Date, the Opening Date itself may be chosen even when it is further away (presale, [ADR-0005](./docs/adr/0005-validity-in-days-with-a-chosen-start-date.md)).
_Avoid_: Activation date, purchase date

**Early Renewal**:
Buying the next Plan while the current Subscription is still effective. If the current Subscription still has classes (base or extra), the new one starts the day after the current one ends. If it has none left, the new one starts on the Start Date the client chooses and the current one ends the day before. Only one future Subscription may exist.
_Avoid_: Auto-renewal, extension

**Weekly Cap**:
The most Bookings a client may fund from a Plan's base allowance in one Monday-to-Sunday week (Bolivia time): 3 on the 16- and 24-class 60/90-day Plans of 8 classes a month, 4 on those of 12 a month, none on 30-day Plans. Extra classes do not count: past the cap, a Booking uses an extra class if one is left. It applies wherever a Booking is made — by the client, by an Assistant, or by Waitlist promotion — and a client at the cap cannot join a Waitlist that week unless an extra class is left ([ADR-0006](./docs/adr/0006-weekly-cap-and-extra-classes.md)).
_Avoid_: Limit, quota

**Allowance Adjustment**:
A change of a Subscription's allowance by a number of extra classes, with a reason and its author, that never touches a Payment: Gift Class, an invitation converted (Guest Pass), a Campaign, a courtesy, or a class returned. Courtesies, class returns, and Campaigns are made only by an Administrator; Gift Classes and invitation rewards are automatic. Clients see each extra class with its origin.
_Avoid_: Bonus, credit, free class (without its reason)

**Gift Class**:
One extra class added automatically to the first real Subscription of a Client's life when its Payment is confirmed. Founders do not get it, and Courtesy Access or a Guest Pass is never a first Subscription.
_Avoid_: Free trial, welcome credit

**Campaign**:
Extra classes an Administrator grants in bulk at given times of year (start of year, holidays), recorded as Allowance Adjustments. Never a price discount, and never combined with a Founder Membership.
_Avoid_: Promotion (a Promotion is carousel content), sale

**Founder Membership**:
A discount of 15 % on every Plan except the single class, held by one of the first 40 distinct Clients whose first real Payment is confirmed. It belongs to the person, not the Plan, and is lost automatically and for good when more than 7 days pass between one Subscription's real end and the next one's Start Date; a Freeze is not a gap. Not combined with a Gift Class or a Campaign; it does take part in Guest Passes ([ADR-0008](./docs/adr/0008-founder-membership.md)).
_Avoid_: VIP, loyalty discount

**Freeze**:
A pause of a Subscription on a Plan of 90 days or more: once per Subscription, up to 15 days, never starting in the past. The client asks with dates and a reason; an Administrator approves or refuses it. During it the client cannot book and Bookings inside it are cancelled with their class returned; the end date moves by exactly the frozen days ([ADR-0010](./docs/adr/0010-freeze-quarterly-subscriptions.md)).
_Avoid_: Pause, hold, suspension

**Courtesy Access**:
A hidden Plan an Administrator grants through a Bs 0 courtesy Payment, so a person can book without paying: the closed-test testers before launch (16 classes on fictitious Sessions) and the stores' review Accounts. It never counts as income or as a first Subscription ([ADR-0012](./docs/adr/0012-sales-controls-and-invoice-data.md)).
_Avoid_: Free plan, trial

**Class Type**:
The catalog definition of a kind of class — e.g. "Reformer Pilates", "Mat Pilates" — with a short client-facing description, a default capacity, and equipment needs. A Class Type has no duration: how long a class lasts belongs to each Session and Session Schedule ([ADR-0004](./docs/adr/0004-session-owns-its-duration.md)). Its name also tells which Equipment its Sessions use (Back Office, «Equipment Kind of a Class Type»).
_Avoid_: Class (when referring to the catalog entry)

**Session**:
A specific scheduled, bookable occurrence of a Class Type, at a given time and for its own duration, with an assigned Trainer and a capacity. A Trainer cannot lead overlapping Sessions, even at different Branches. Capacity defaults from the Class Type but can be overridden per Session (e.g. reduced because Equipment is out of service). Clients book Sessions, not Class Types. A Session is taught only if it reaches the Minimum Bookings; otherwise the system cancels it at the 3-hour check. An Administrator or a Coordinator can also cancel a Session that has Bookings, as a last resort when no substitute Trainer can cover it: every Booking on it is cancelled, each client's allowance unit is refunded even inside the Cancellation Window, and the clients are notified.
_Avoid_: Class (when referring to a specific occurrence)

**Minimum Bookings**:
The fewest confirmed Bookings a Session needs to be taught: 2, configurable in Studio Settings. A one-time check 3 hours before the start cancels a Session below it with the cause «minimum not met», returns the class to each booked client, tells them which other Sessions that day have places, closes the Waitlist, and notifies the Trainer, who is paid a compensation for it. When the Cancellation Window closes, the Session records how many Bookings it has, which is what the Trainer is paid on ([ADR-0007](./docs/adr/0007-minimum-bookings-replace-the-zero-booking-check.md)).
_Avoid_: Quorum, minimum attendance

**Session Schedule**:
An Administrator-defined weekly pattern for a Class Type, Branch, Trainer, time, duration, and normal capacity that generates concrete Sessions up to 30 days ahead. A change takes effect from a selected future date and updates only unbooked future Sessions; Sessions that already have Bookings remain unchanged unless an Administrator explicitly edits or cancels them.
_Avoid_: Recurring Session, schedule template

**Booking**:
A client's reserved spot in a Session, with its own status (booked / cancelled / rescheduled). Created by the client or by an Assistant on the client's behalf. Consumes one unit of the Subscription's allowance when created; Cancelling refunds that unit back to the allowance, while Rescheduling does not — it's the same already-consumed unit moved to a different Session.
_Avoid_: Reservation, registration

**Waitlist**:
The ordered queue of clients waiting for a spot in a Session that is at capacity. A client may join only before the Session enters its Cancellation Window, only with an active Subscription whose date range includes the Session, and not while at the Weekly Cap for that week unless an extra class is left. Joining consumes no allowance and does not require allowance to remain, so a client can sit on several Waitlists at once. When a spot frees, the first eligible client in the queue is promoted automatically into a real Booking — consuming one allowance unit at that moment — and notified. A client is skipped, but stays queued, if they can't take the spot: no allowance left, an expired Subscription, the Weekly Cap reached since joining, or an existing Booking that overlaps the Session's time at any Branch. Promotion stops once the Session enters its Cancellation Window, so a client is never added to a Session they can no longer cancel out of; a spot freed inside the window simply goes unfilled. Entries that remain when the Session starts close without a notification. A Waitlist belongs to a Session only — Evaluations have none, and a freed Evaluation slot just becomes bookable again.
_Avoid_: Queue, standby, wait list

**Attendance**:
A record, set by the assigned Trainer after a Session happens, of whether a Booking's client actually showed up (attended / no-show). The Trainer completes the whole roster in one save and may later correct it; no arbitrary correction deadline applies in the first release. Only exists once the Session has occurred. A client's class history is their Bookings with Attendance = attended. Purely a reporting record — it has no effect on the Subscription or its allowance, since the class was already consumed when the Booking was created.
_Avoid_: Check-in

**Cancellation Window**:
The period immediately before a Session's start time — 2.5 hours, kept in Studio Settings. Inside it, a Booking can no longer be freely cancelled — Reschedule is the only option left. Outside it, a client changes plans via Cancel + a new Booking instead.
_Avoid_: Grace period, cutoff, deadline

**Reschedule**:
The fallback operation available only once a Booking can no longer be freely cancelled (inside the Cancellation Window). Moves the Booking to a different same-day Session with capacity. Outside the Cancellation Window, changing a Booking is just Cancel + a new Booking.
_Avoid_: Change booking, swap

**Evaluation**:
A one-on-one appointment between a client and the Nutritionist, booked against the Nutritionist's published availability. Distinct from a Session: no Class Type, no capacity, single client. Bookable only with an active Subscription. A Subscription on a Plan of 90 days or more includes one Evaluation, to be used inside its date range; any other client pays for a Paid Evaluation ([ADR-0011](./docs/adr/0011-paid-evaluations.md)). Neither consumes class allowance. Can be freely cancelled up to 3 hours before its start; a later cancellation or a no-show counts the Evaluation as used. A cancelled Evaluation's slot becomes bookable again; unlike a Session, it has no Waitlist. The client is reminded twice: 1 day before (skipped when booked less than a day ahead), and again 1 hour before. Booking closes 3 hours before the start, where free cancellation ends. "First" versus "follow-up" is derived from the client's earlier Evaluations. The Nutritionist may cancel their own Evaluation, and an Administrator any Evaluation, at any time before its start; the client is notified, and an included Evaluation is not used up. A later Subscription expiry does not cancel a booked Evaluation. Assistants do not book or cancel Evaluations. Each Evaluation held is a cost to the studio (Back Office). (See [NUT-001](../docs/implementation/NUT-001-nutritionist-evaluation-schema-proposal.md).)
_Avoid_: Appointment, session (when referring to a nutritionist evaluation)

**Paid Evaluation**:
An Evaluation paid for by a client whose Subscription does not include one: Bs 70 (Studio Settings), by QR in the app or in cash at the front desk, as a Payment of its own with no Subscription. While its transfer Payment is pending the slot is held for 24 hours, then released if not confirmed.
_Avoid_: Consultation fee, nutrition plan

**Availability Block**:
A recurring weekly open time range the Nutritionist publishes (e.g. "Tuesdays 9am–1pm") from which the system generates concrete, fixed-length, individually bookable Evaluation slots up to 30 days ahead. A change takes effect from a selected future date and updates only unbooked future slots; an Evaluation that is already booked remains unchanged unless it is explicitly cancelled. Each block belongs to one Branch assigned to the Nutritionist; slots are 45 minutes, cut back-to-back from a start on a 15-minute grid. One Nutritionist's blocks and slots never overlap, even across Branches, but Evaluations do not use the Branch's studio room, so they may overlap its Sessions. Removing a block ends it from a chosen date, and losing the Branch assignment ends the Nutritionist's blocks there.
_Avoid_: Schedule, working hours

**Credit** (retired):
A money balance earned through the former Bs 60 referral reward. Nothing earns, reserves, or spends it any more ([ADR-0009](./docs/adr/0009-invite-a-friend-replaces-referral-credit.md)); its historical ledger rows stay.
_Avoid_: Discount, coupon, balance

**Referral Code**:
A short code each Client and each Trainer holds. A new Client who registers with one is attributed to its holder, and that attribution wins over the Acquisition Channel she picks. A Client's code is how she invites a friend (Guest Pass); a Trainer's code earns the Trainer a commission on the new Client's first Plan.
_Avoid_: Promo code, coupon

**Acquisition Channel**:
How a Client found the studio, asked at registration and at the front desk: Instagram, TikTok, Facebook, Google, a friend's recommendation, a Trainer, walking past the studio, or other. A Referral Code, when given, decides the attribution.
_Avoid_: Source, lead source

**Guest Pass**:
A friend's single free class, given once in her life, when she registers with a Client's Referral Code (in the app or at the front desk). It is for a Session with a free place that is not the last one, and each host may invite one friend a month. If the friend buys a Plan, the host gets one extra class on her current Subscription, or on her next one if she has none.
_Avoid_: Referral reward, free trial, invite (without the Guest Pass qualifier)

**Purchase Intent**:
A client's 24-hour commitment to the selected Plan, its Start Date, any Founder discount, and the resulting amount to pay before a transfer Payment exists. It grants no access and expires if the client does not submit a transfer receipt in time.
_Avoid_: Payment, cart, checkout session

**Branch**:
A physical studio location with a single studio room, so two Sessions at the same Branch never overlap in time — a Branch's schedule is one class after another. Every Branch uses Bolivia civil time rather than carrying its own time zone. Sessions, Evaluations/Availability Blocks, and staff assignments are scoped to a Branch. Plans and Subscriptions are studio-wide and not tied to a single Branch — a client's Subscription grants access at any Branch. (See [ADR-0001](./docs/adr/0001-model-branch-as-first-class-entity.md).)
_Avoid_: Location, studio (when referring to a single site), site

**Client**:
A studio customer who holds Subscriptions and creates Bookings/Evaluations. Has no home or default Branch — can book at any Branch. Account may be self-registered or created by an Assistant; an Assistant-created Account is activated by the Client through an emailed link rather than a staff-provided password. Carries an Acquisition Channel and, when relevant, the Referral Code she came with.
_Avoid_: Customer, member, user

**Staff Member**:
A person working for the studio, with exactly one Role (Trainer / Nutritionist / Assistant / Coordinator / Administrator) and a set of assigned Branches (all, implicitly, for Administrator and Coordinator). Assistants act on behalf of clients — Bookings, sales (cash and front-desk transfer receipts), registering new Clients, the Cash Close — at their assigned Branches (they may look up and read any Client, since Clients have no Branch, but may create, cancel, reschedule, or leave a Booking or Waitlist Entry only for Sessions at a Branch assigned to them); they can never change or void a sale. The Coordinator runs the studio's operation without seeing any money: the schedule, Sessions, Trainer swaps, cancelling a Session with Bookings, Client profiles and Bookings, Staff details, and the follow-up contact list, but never sales, prices beyond the public ones, pay, or costs, and never registering a new Client ([ADR-0102](../docs/adr/0102-coordinator-role-without-money.md)). Administrators hold everything, including every money decision: confirming and voiding Payments, courtesies and class returns, Campaigns, and approving Freezes. Trainers record Attendance for their own Sessions; the Nutritionist publishes Availability Blocks and holds Evaluations.
_Avoid_: User, employee, personal

**Payment**:
A record of how a sale is settled — a Plan or a Paid Evaluation — with a method (transfer / cash / courtesy; Credit-only on historical rows), a status (pending / confirmed / rejected / voided), the Plan's list price, any Founder discount, the Money Amount the client was asked to pay, and optional Invoice Data. A transfer Payment's receipt is uploaded by the client in the app or by an Assistant at the front desk; it stays pending, granting nothing — the client sees «Pago en revisión» and cannot book with it — until an Administrator checks it against the money in the bank and confirms it, which starts the Subscription on its Start Date. If the receipt doesn't hold up, the Administrator rejects it with a short reason the client sees, and the client raises a new one. A push notification tells the Administrator one is waiting. A cash Payment is recorded by an Assistant with the money in hand and is confirmed immediately; a courtesy Payment (Bs 0, Courtesy Access) is made only by an Administrator. A Payment can be raised while the current Subscription is still effective (Early Renewal). No one but an Administrator changes a sale: voiding it, with a reason, ends its Subscription, cancels its future Bookings, keeps the Attendance already taken, and returns no money ([ADR-0012](./docs/adr/0012-sales-controls-and-invoice-data.md)).
_Avoid_: Charge, transaction, completado (UI label for confirmed). The pending state reads «Pendiente» in the admin web, as follow-up 59 §2 settled.

**Invoice Data**:
The tax identity a client wants on her invoice for a sale — NIT or CI, and a name or business name — prefilled from her last sale and optional («Sin factura»). Invoices are issued outside the system; an Administrator marks a sale «Factura emitida», which records who and when, and can undo the mark, both audited. Closing her Account erases it from her sales, which keep the mark ([ADR-0097](../docs/adr/0097-erase-personal-data-when-a-client-account-closes.md)).
_Avoid_: Factura (the system issues none), receipt

**Promotion**:
Admin-managed carousel content (image, headline, description, display date range) shown to clients. Purely informational — carries no automatic pricing or discount effect.
_Avoid_: Offer, deal, coupon

**Promotion Contact**:
A former Client who, while closing their own Account, agreed to keep receiving the studio's promotions: their name, email, and phone as they were, and when they agreed. It has no link to the closed Client or Account, whose personal data is erased on closure (ADR-0097), and it records when the person asks to stop.
_Avoid_: Lead, subscriber, mailing list

**Promotions Consent**:
A live Client's agreement, given or withdrawn from Perfil, to receive the studio's promotions: when they agreed and when they stopped, one record per period (ADR-0098). The name, email, and phone come from the Client while it is open. Closing the Account ends it; if the Client ticks the closure box, the Promotion Contact keeps the consent's original time.
_Avoid_: Opt-in, subscription (a Subscription is a Plan's date range), marketing permission

**Studio Settings**:
The single versioned record of the studio's configurable rules: Cancellation Window, Minimum Bookings and the check's lead time, the Start Date limit, Founder places, discount, and gap, the Guest Pass rules, the tax rate, the Paid Evaluation price and the Nutritionist's fee, the renewal targets, and the Opening Date. Every change is audited with its old and new value; apps read the client-facing rules from it instead of hard-coding them ([ADR-0101](../docs/adr/0101-keep-studio-rules-in-studio-settings.md)).
_Avoid_: Config, constants, environment variables

**Opening Date**:
The day the studio opens, entered by the Administrator when known. It allows presale Start Dates and counts the months of operation for the Coordinator's renewal targets.
_Avoid_: Launch date (the apps' store launch is a different event)

**Lifecycle Message**:
One of the push and inbox messages a new Client receives on day 2, week 1, day 30, and day 90 after her first real Subscription starts, each sent once.
_Avoid_: Drip, campaign

**Contact Alert**:
A Client flagged for a personal message on the «Para contactar» list: no Booking in 7 days, fewer than 2 classes by day 15, or fewer than 4 classes in her first 30 days. The Coordinator or an Administrator writes to her by WhatsApp by hand and marks her contacted.
_Avoid_: Churn alert, lead
