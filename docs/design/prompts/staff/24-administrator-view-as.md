# Prompt S24 — Ver la app como… (Administración)

Staff app, Administrator role only. Reached from the new «Ver la app como…» row that [follow-up 108](../followups/108-impersonation-entry-and-banner.md) adds to Perfil (Prompt S23). Choosing a person here starts an Impersonation ([ADR-0100](../../../adr/0100-impersonate-a-staff-member-from-the-staff-app.md), [FUT-001](../../../implementation/FUT-001-impersonation-proposal.md)): for the next 30 minutes the app shows and acts as that Staff Member, under the banner that follow-up 108 draws on every screen, until «Salir», the time runs out, or the Administrator logs out.

Written by FUT-001 on 2026-10-22. Send [30](../followups/30-invariants-checklist.md) alongside this prompt.

---

Using the Emma Pilates Studio design system (Prompt 00) and the same header-with-back-arrow pattern as Perfil (Prompt S23), design the **Ver la app como…** screen of the staff app, as seen by an Administrator.

**Language:** all visible copy is neutral Spanish (Bolivia), informal "tú" address.

**Navigation chrome:** header with a back arrow that returns to Perfil (S23) and the title «Ver la app como…». No tab bar — the staff app has none.

**Layout, top to bottom:**

1. An intro note in the Nota style (13 px, `#7A716D`, line-height 1.55), no card: «Verás la app tal como la ve esa persona, con sus clases y sus sucursales, durante 30 minutos. Puedes salir cuando quieras desde la franja de arriba.»
2. One list group per Role, in this order and only when it has someone: **Entrenadoras**, **Asistentes**, **Nutricionistas**. Each group is a white card (1 px `#D8C9BB`, radius 16, no shadow, like S23's groups) with a 12 px uppercase 0.14em `#766D69` eyebrow for the Role name above it (outside the card, same style as the field labels of S23's change-password step), and one row per active Staff Member of that Role:
   - the 40 px initials avatar on `#EFE0DC` with `#7A4F4B` Lora initials (two letters, as S23's summary card, smaller);
   - the name in 16 px `#4A4A4A`, and under it the assigned Branches in 13 px `#766D69` («Equipetrol, Urubó»);
   - the 19 px `#B78380` chevron of every tappable row (README «Row chevrons»).
   Rows are 64 px, separated by 1 px `#EFE7DE` rules inside the card. Administrators never appear (the Administrator cannot see the app as another Administrator), and neither do pending or deactivated Staff Members.
3. Nothing else: no search field (the studio has a handful of Staff Members), no primary button.

**Tapping a row** opens a bottom sheet (the same sheet treatment as S14's confirmation): title «¿Ver la app como Camila Rojas?» in Lora 20 px, the line «Durante 30 minutos verás sus clases y sus sucursales y podrás actuar como ella. Todo lo que hagas quedará registrado a tu nombre.» in the Nota style, a primary button «Ver como Camila», and a text action «Cancelar». Confirming closes the sheet and the app re-draws as that Role's root (S02, S04, or S15) under the banner of follow-up 108; this screen is not shown again until the Administrator is back in her own session.

**Empty state** (no active Staff Member outside Administración): the bare empty state of the README's «Cards» section, title «Nadie a quien ver todavía» in Lora 19 px, line «Cuando actives a una entrenadora, asistente o nutricionista, aparecerá aquí.».

**Loading and failure:** the branded loading state of section 08 while the list loads; the plain «No pudimos cargar al personal.» with «Reintentar» on failure, as every other list in the staff app.

Show these frames:

- **iOS · Lista** — two Entrenadoras (Camila Rojas · Equipetrol; Emma Vargas · Centro, Equipetrol, Urubó), one Asistente (Julia Soto · Equipetrol), one Nutricionista (Carla Méndez · Centro), the intro note above.
- **iOS · Confirmación** — the same list with the sheet open over it for Camila Rojas.
- **Android · Lista** — same content, Android header height.
- **Tablet · Lista** — the iPad Pro 11 frame: the list centred in a 560 px column, the rest unchanged (the same width S23 uses on the tablet).

Generous whitespace, calm tone, consistent with S23. Nothing on this screen is editable; it only chooses who to see as.
