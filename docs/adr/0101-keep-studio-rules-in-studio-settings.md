# Keep the studio's configurable rules in Studio Settings

Status: accepted (2026-10-23)

Business rules were constants in code: the 2.5-hour Cancellation Window alone appeared six times across the API, the shared mobile package, and app copy, and prices like «Paquetes desde Bs 560» were written into screens. The owner wants some rules editable from the web (the Minimum Bookings among them), and every rule change used to need an app release.

A single versioned **Studio Settings** record, owned by Booking & Membership, holds the Cancellation Window, the Minimum Bookings and the check's lead time, the Start Date limit, the Founder places, discount, and gap, the Guest Pass rules, the tax rate, the Paid Evaluation price and the Nutritionist's fee, the renewal targets, and the Opening Date. Each change writes a new version and an audit record with the old and new value. The admin web edits the values the owner calls configurable; the rest change only through a reviewed release. A public read endpoint gives the apps the client-facing values, so copy follows the rules without a new build.

Rejected: environment variables (a restart and a deploy for a business change, and no history); one table per rule (dozens of tiny tables for values read together).
