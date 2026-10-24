# Give the first 40 Clients a Founder Membership

Status: accepted (2026-10-23)

The owner opens with a founders' offer: 15 % off every Plan except the single class, for 40 Clients. The owner chose (2026-10-23) that the places go automatically to the first 40 distinct Clients whose first real Payment is confirmed, rather than being assigned by hand. Courtesy Access never takes a place.

The membership belongs to the person, so it follows her across Plans, and it is lost automatically and for good when more than 7 days pass between one Subscription's real end and the next one's Start Date (an early end by Early Renewal counts from that real end; a Freeze is not a gap). A nightly job ends it, audits it, and tells the Client.

The discount is stored on the Payment (`discountCentavos`, `discountReason = founder`) next to the list price, so reports show list price, discount, and amount paid. It is not combined with the Gift Class or Campaigns, but a founder can still invite a friend. This reintroduces a discount after [ADR-0007](../../../docs/adr/0007-drop-descuentos-from-admin-web.md) removed the admin-web «Descuentos» screen: there is still no free-form discount, only this rule.
