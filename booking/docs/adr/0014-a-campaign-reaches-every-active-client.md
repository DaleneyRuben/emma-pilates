# A Campaign reaches every active Client

Status: accepted (2026-11-17)

[ADR-0006](./0006-weekly-cap-and-extra-classes.md) records a Campaign as `campaign` Allowance Adjustments on a Subscription, and [ADR-0008](./0008-founder-membership.md) kept founders out of it. FIX-001 also left out Courtesy Access, a hidden Plan, and a Bs 0 Plan, and FIX-060 named every Client left out and why. On the walkthrough data all seven Clients were founders, so a Campaign reached nobody (walkthrough finding 90, 2026-11-17).

The owner decided: «TODAS las clientas no matter what».

- **Every active Client receives the classes.** Active means the Client and her Account are not closed or removed: the same Clients the directory and Promociones › Contactos list. Founders are included, and so is a Client on Courtesy Access, a hidden Plan, or a Bs 0 Plan. A closed or removed Account receives nothing.
- **With a current Subscription**, the classes go on it: ACTIVE, its date range covering today in Bolivia, the most recently activated if two overlap. A Guest Pass is never her Plan, so the classes never land on one.
- **Without one**, the classes are owed. The next Subscription she activates collects them as an ordinary `campaign` Allowance Adjustment with the Campaign's name, the same way an owed invite reward is collected ([ADR-0009](./0009-invite-a-friend-replaces-referral-credit.md)). It never collects onto a Guest Pass. A Client who closes her Account before buying never collects them.
- A Campaign is still never a price discount, and only an Administrator grants one.

The admin web counts every active Client before the grant and, for those without a current Plan, says the classes are added with their next Plan. «Dar las clases» is disabled only when there is no active Client.

Founders keep their 15 % and still never receive the Gift Class: this decision changes only Campaigns.
