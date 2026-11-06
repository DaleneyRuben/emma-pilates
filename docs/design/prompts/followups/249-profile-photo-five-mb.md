# Follow-up — A profile photo is at most 5 MB

Targets: **P07 Estudio › Personal** member panel (admin web v2) and the
proposal boards `design/v2/propuestas-foto-equipo/` A5, A6, B5 and B6. Read
with [240](./240-staff-profile-photo-proposals.md),
[241](./241-staff-profile-photo-proposals-corrections.md),
[242](./242-staff-profile-photo-on-the-screens.md) and
[247](./247-no-photo-crop-caption.md). Send
[30](./30-invariants-checklist.md) alongside.

---

Written on 2026-11-05 while building FIX-041. Follow-ups 240 to 242 wrote
the web's limit as 10 MB, copied from the salary receipt. A profile photo's
limit is **5 MB** (ADR-0072: «A Client or Staff Member profile photo accepts
the same formats up to 5 MB»), and the API refuses anything larger.

## The change

From here on, read every «10 MB» about a profile photo as «5 MB»:

- The member panel's line becomes «JPG, PNG o WebP, hasta 5 MB.»
- The wrong-file message becomes «Elige una foto JPG, PNG o WebP de hasta
  5 MB.»

The boards change the same two lines in every state. The salary receipt and
the transfer receipt keep their 10 MB.

## Leave untouched

Everything else on these screens and boards.
