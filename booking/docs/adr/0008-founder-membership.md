# Give the first 40 Clients a Founder Membership

Status: accepted (2026-10-23)

The owner opens with a founders' offer: 15 % off every Plan except the single class, for 40 Clients. The owner chose (2026-10-23) that the places go automatically to the first 40 distinct Clients whose first real Payment is confirmed, rather than being assigned by hand. Courtesy Access, a hidden Plan, and a Bs 0 Plan never take a place.

The owner clarified (2026-10-28) that the 15 % applies from the founder's first Plan, not from the second. The place is decided, under the existing lock, when the sale is priced (purchase intent, cash sale, or front-desk QR), while places remain, and it becomes final at confirmation. A founder never receives the Gift Class or Campaign classes. She can still invite a friend.

The membership belongs to the person, so it follows her across Plans, and it is lost automatically and for good when more than 7 days pass between one Subscription's real end and the next one's Start Date. The gap is the next Start Date minus (the previous real end + 1 day): a gap of exactly 7 days keeps the membership, and a gap of more than 7 days loses it. An early end by Early Renewal counts from that real end; a Freeze is not a gap. The check reads every non-voided Subscription, including one that has already ended, and it also runs when the next sale is confirmed, so a future Start Date cannot hide the gap. A nightly job ends a membership the sale check has not already ended, audits it, and tells the Client. Voiding the sale that granted the place frees the place again.

The discount is stored on the Payment (`discountCentavos`, `discountReason = founder`) next to the list price, so reports show list price, discount, and amount paid, including a founder who pays by QR at the front desk. This reintroduces a discount after [ADR-0007](../../../docs/adr/0007-drop-descuentos-from-admin-web.md) removed the admin-web «Descuentos» screen: there is still no free-form discount, only this rule.
