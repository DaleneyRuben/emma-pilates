# Follow-up — the Promotions carousel on Inicio as MOB-019 built it

Targets: **Client `02`**. Send this alongside
[30](./30-invariants-checklist.md), with [39](./39-align-booking-membership-schema.md)
§4 and [47](./47-home-referral-shortcut-credit.md), which it completes (a
sent follow-up is never edited).

---

MOB-019 built the carousel on Inicio against `02`, 39 §4, and the image
variants UPL-002 delivers (16:9 WebP at 480, 960, and 1440 px, ADR-0073 and
ADR-0077). The export draws 268 px cards with a 2:1 image peeking side by
side; the app pages one card at a time and shows a few states the frame does
not draw. Make the frames match what ships. Change nothing else.

## 1. `02` — One card per page, 16:9, with position dots

- The section keeps its label **Novedades del estudio**. Each card is as wide
  as the content column (the screen minus the 16 px gutters) and the next card
  does not peek on the phone; a swipe moves exactly one card (snap per card,
  as the frame's note already says).
- The image block is **16:9**, edge to edge inside the card, with the
  headline (Lora 18/500) and the description (13/1.5, Texto secundario) under
  it, as now. A Promotion is purely informational: the card has no tap
  target, no price, no button.
- Under the carousel, when there is more than one Promotion, a row of
  **position dots**: 6 px Rosa empolvado dots, the current one an 18 px Palo
  de rosa pill, centred. With one Promotion there are no dots.

## 2. `02` — Loading, empty, and tablet frames

- While the list loads, the section shows one placeholder card: a Palo de
  rosa tinte 16:9 block, then a short tinte bar for the headline and a
  Divisor bar for the description. No spinner, no copy.
- When there is no published Promotion, or the list cannot be read, the
  whole section disappears (label included): the plan card follows the
  greeting directly. Draw the active-plan frame once without the section.
- Pull to refresh on Inicio re-reads the carousel with the rest of the
  screen.
- On a 393 × 852 phone the greeting, the card, its dots, and the plan card
  fill the first screen; the quick actions start below the fold and need one
  scroll. If the studio would rather keep a quick action above the fold,
  say so and the card can shrink (the export's 268 px peeking card is the
  alternative); the app keeps the full-width card until then.
- On a tablet, the card stops at **720 px** wide and the next card peeks on
  the right; the rest of Inicio keeps its phone-first single column.

## 3. `02` — Sample content

The frame's sample copy from 39 §4 stays informational. The two cards MOB-019
verified with can be used as samples: «Nueva sala de Reformer en Urubó» —
«Desde el lunes 5 abrimos la segunda sala con seis camas nuevas. Reserva tu
clase como siempre.» and «Clases de Barre los sábados» — «A las 9:00 en
Centro, con Andrea. Trae ropa cómoda y calcetines antideslizantes.».

## Preserve everything else

Do not change the greeting, the plan card and its states, the quick actions
(47), the tab bar, the avatar rule of invariant 9, or any screen not named in
Targets.
