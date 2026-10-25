# Keep sales immutable for the front desk and record Invoice Data

Status: accepted (2026-10-23)

The owner's controls on money:

- **Only an Administrator confirms or rejects transfers**, including receipts an Assistant uploads at the front desk for a Client paying by QR there; cash sold by an Assistant is confirmed on the spot, as before.
- **Sales are immutable** for everyone but the Administrator, who can **void** one with a reason (owner, 2026-10-23): its Subscription ends, its future Bookings are cancelled, Attendance already taken stays, and no money is returned, because a void corrects a mistake rather than refunding. A voided Payment leaves the revenue figures and stays visible with its reason.
- Courtesies and class returns are Allowance Adjustments only an Administrator makes. **Courtesy Access** — a hidden Plan granted through a Bs 0 `courtesy` Payment — is how the closed-test testers and the store reviewers book without paying; only a hidden Plan may cost Bs 0.
- **Invoice Data**: invoices are issued outside the system (no SIAT integration). Each sale may carry a NIT or CI and a name or business name, prefilled from the client's last sale and optional — «Sin factura» is allowed (owner, 2026-10-23). The Administrator marks a sale «Factura emitida», recording who and when, and filters the sales still unbilled.

Everything here is audited: who, what, when, and for which Client.
