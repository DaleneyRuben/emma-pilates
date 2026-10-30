# Replace the Bs 60 referral Credit with invite-a-friend and Referral Codes

Status: accepted (2026-10-23); retires Credit and the Bs 60 Referral reward

A referring Client used to earn Bs 60 of Credit when her referral's first Payment was confirmed, spendable on her next Plan. The owner removes money credit altogether. Production holds no real Client, so no balance needs honoring; historical ledger rows stay (soft delete only) and Credit fields stay in the contract as deprecated zeros until the mobile baseline moves (ADR-0016).

What replaces it:

- **Referral Codes** for every Client and every Trainer. A new Client gives one at registration (app) or to the Assistant; a code decides her attribution over the **Acquisition Channel** she picks (Instagram, TikTok, Facebook, Google, a friend, a Trainer, walking past, other). A Trainer's code earns the Trainer 10 % of the Client's first Plan (Back Office).
- **Guest Pass**: a friend who registers with a Client's code gets one free class once in her life, in a Session with a free place that is not the last; a host invites one friend a month; if the friend buys a Plan, the host gets one extra class (`invite_converted`) on her current real Subscription or her next one, never on the host's own Guest Pass. The pass opens when the friend's email is verified, or when an invited friend activates her account, so an unverified registration cannot spend the host's monthly invite, and reaching that monthly limit never fails the friend's registration: the second friend that month is registered and gets no pass. The owner clarified (2026-10-28) that if the friend cancels that free class in time, she may book another one, and the same Guest Pass rules apply again: a Session with a free place that is not the last. A Guest Pass is not a current Plan: buying a real Plan does not push that Plan out by the pass, and the pass ends when she buys.

The referral code a Client already has is kept, so nothing printed or shared breaks.
