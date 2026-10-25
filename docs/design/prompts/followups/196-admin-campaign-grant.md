# Follow-up — campaign extra classes from Clientes

Targets: **AW21 (Clientes)**. Send
[30](./30-invariants-checklist.md) alongside this follow-up.

---

Written by BKM-015 on 2026-10-23 from decisions §5.4 and §5.6 and booking
ADR-0006. Only the Administrator creates a campaign, and a campaign never
discounts a price. The grant belongs on Clientes, the list of the people it
reaches, not on a new screen and not in the sidebar.

## `AW21` — the campaign grant

On the desktop frame and the narrow frame, add one primary button in the
title row, where a «+ Nuevo» button would sit (this list stays read-only
otherwise): «Dar clases de campaña». It opens
`admin.emmapilates.bo/back-office/clientes/campana`. Clientes stays marked
in the sidebar. The Branch selector keeps AW34's studio-wide note.

The page, top to bottom:

1. Title «Campaña» (Lora 27) and the subtitle «Clases extra para el inicio de
   año o las vacaciones. No cambia ningún precio.»
2. A white card (12 px radius, 1 px Borde, 24 px padding) with, in Texto
   secundario, «12 clientas la recibirán.» and, in Texto tenue, «Sofía no
   tiene un plan vigente.» Then the design system's form fields: «Nombre de
   la campaña» (empty) and «Clases extra» (value 1, helper «Entre 1 y 4
   clases.»). The primary button «Dar las clases» (46 px, left-aligned).
3. Confirming asks with the primary tone, title «¿Dar las clases de
   campaña?», the line «Cada clienta con un plan vigente recibe las clases.
   Una clienta sin plan vigente no recibe nada, y ningún precio cambia.»,
   and the buttons «Volver» and «Confirmar campaña».
4. After it answers, AW21's Éxito result line above the card: «1 clienta
   recibió 1 clase extra. 1 clienta no tiene un plan vigente: Sofía.»

## Leave untouched

The Client table, the search, the detail panel (AW22), the extra-class line
follow-up 195 already asks for, and every other screen. Do not add a
discount, a price, or a sidebar entry.
