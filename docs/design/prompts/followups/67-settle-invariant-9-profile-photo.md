# Follow-up — Settle invariant 9: the header account avatar is never a photo

Targets: **Client `18`, `22`; checklist [30](./30-invariants-checklist.md) §9**. Send this together with [63](./63-client-profile-photo-as-built.md), which it settles, and with 30 and [60](./60-image-crops-and-formats.md) §1. Follow-up 30 stays unedited; this follow-up carries the amendment.

---

Follow-up 63 asked the design session to choose between keeping the Client profile photo on `18` and `22` or removing it everywhere. The decision (2026-09-30, DES backlog) is the first option, which is what MOB-020 shipped: ADR-0073 and ADR-0076 treat the profile photo as a product feature with its own upload purpose, variants, and deletion rule.

## 1. Amend checklist 30 §9

Read the first line of §9 as: **The header account avatar** — the "Tu cuenta" control, rightmost in the header of `02`, `S02`, `S04`, `S11`, and `S15` — is a filled `#D8BDB8` circle with two white Lora initials. **It is never a photo**, never has a border, and is never inside a square. Every other point of §9 is unchanged.

## 2. Where a photo may appear

- Only on the Client's own profile: the summary card of `18` and the avatar of `22`. Each shows the Client's photo, centre-cropped into the circle, when one is attached, and the initials on tint otherwise.
- Nowhere else. No Staff screen, no admin screen, and no header avatar shows a photo.

Apply 63 as written under this decision. Nothing else on `18` or `22` changes.
