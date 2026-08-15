# Extend Payment confirmation to the desktop admin web app

Status: accepted

Amends [ADR-0004](./0004-split-administrator-across-mobile-and-desktop.md). Confirming or rejecting a pending transfer Payment is no longer mobile-only — it is now also available from the admin web app's **Pagos** page. This does not move the capability; it duplicates it. The mobile flow (Prompts S11/S12) is unchanged and stays the fast path a push notification opens directly into.

ADR-0004's mobile case still holds: a client's proof and the studio's bank app are both phone-native, so a single pending Payment is fastest to check from a phone. What it didn't account for is the backlog case — working through several pending Payments in one sitting, cross-referencing a bank statement open in another browser tab, or an Administrator who is simply already at a desk. That is the same "tabular, deliberate work" case ADR-0004 already grants to the rest of Back Office; a payments *list*, as opposed to a single push-notification-driven confirmation, fits it better than a phone screen.

The risk ADR-0004 named — standing pressure to add a third urgent task to mobile — is a different risk from this one and is unaffected: nothing is being added to mobile, and nothing is being removed from it. The two surfaces now simply overlap on this one action, same data, same effect, confirmed from whichever surface the Administrator is at.
