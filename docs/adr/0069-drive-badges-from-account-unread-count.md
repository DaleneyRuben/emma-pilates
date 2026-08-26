# Drive badges from the Account unread count

Status: accepted

Every user-facing notification is first stored as one durable inbox entry owned by the recipient Account; push delivery is an optional prompt for that entry rather than the entry itself. An entry has an unread or read state shared across every device signed in to the Account. Opening the inbox entry, or opening its authorized destination from that notification, marks it read. Delivery retries and duplicate push receipts do not create duplicate inbox entries for the same recipient and business event.

The mobile app-icon badge equals the backend's authoritative unread inbox count. A push may carry the expected count for immediate display, but the app refreshes and applies the authoritative value at startup, foregrounding, inbox refresh, and read-state changes so delayed or out-of-order pushes cannot leave a permanent wrong number. The badge counts notification inbox entries only; it does not mix in pending Payments, unread email, or other workflow counters.

Device-local counts were rejected because multiple installations would disagree and reinstalling the app would lose state. A dot without a number and no badge were rejected because the approved client and staff designs already distinguish read from unread notification entries, making an exact synchronized count useful and understandable.
