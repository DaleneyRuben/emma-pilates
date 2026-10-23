# Handoff: Emma Pilates Studio — client app, staff app, admin web

## Overview

Three surfaces for a Pilates studio in Santa Cruz de la Sierra, Bolivia:

| Surface | Files | Form factor | Users |
|---|---|---|---|
| **Client app** | `01`–`24` | Mobile (iOS/Android, 390×844 reference) | Clients: booking, plans, payments, nutrition, referrals |
| **Staff app** | `S01`–`S23` | Mobile | Trainers, front desk, administration, nutritionist |
| **Admin web** | `AW01`–`AW34` | Desktop web (1440px reference, 420px narrow) | Studio management: schedule, catalog, back office, reports, promotions |
| **Design system** | `Sistema de Diseño.dc.html` | — | Source of truth for tokens and components |

All product copy is **neutral Spanish (Bolivia), informal "tú" address**. Currency is the boliviano, written `Bs 1.200,00` (dot thousands, comma decimals). Dates are `dd/mm/aaaa`, times are 24-hour.

Plans always sell a **fixed number of classes** — no plan is unlimited, anywhere. The full catalog, shown in the admin screens (`AW04`, `AW05`) and used in every piece of sample data: **Paquete de 8 clases (Bs 560) · Paquete de 12 clases (Bs 780) · Mensual 16 clases (Bs 1.050) · Trimestral 36 clases (Bs 2.100) · Semestral 90 clases (Bs 5.400) · Anual 180 clases (Bs 9.600)**. The client-facing screens (`08`, `S09`) offer the first four. Durations are 1, 3, 6 or 12 months — there is no 15-day pass. A plan's validity starts **when the payment is confirmed**, never at the first class. What a client consumes is a **clase**; a **sesión** is the class as scheduled in the studio's timetable.

More than **2 h 30** before the class starts, cancelling is free and returns the class to the plan; changing to another Session then means cancelling and booking again. Inside the **2 h 30** Cancellation Window free cancellation is unavailable: the client can only reschedule to another class the same day, subject to capacity, which moves the class already used and consumes no other. There is no cancellation fee and no reschedule outside the window. If the studio cancels a session, the class is refunded to **every** booking, including those inside the Cancellation Window.

In the client app the **only** payment method is a transfer to the studio's QR with the receipt attached. Cash is registered by the team in the staff app (`S10`), never by the client.

## About the design files

The files in this bundle are **design references created in HTML** — prototypes that show intended look, copy, and behavior. They are **not production code to copy**.

The task is to **recreate these designs in the target codebase's existing environment** (React, Vue, React Native, SwiftUI, native Android, etc.) using its established component library, routing, and state patterns. If no codebase exists yet, pick the framework that best fits the product (a React Native or Flutter client/staff app plus a React admin web is the natural split) and implement the designs there.

Each file is a self-contained HTML document. Open any of them directly in a browser. Two things to know while reading them:

- Every file loads `support.js` (included in this bundle) and wraps its markup in an `<x-dc>` element. That is the authoring runtime of the design tool — **ignore it**; the markup inside is what matters.
- Styling is **inline on every element** by design. Read the inline `style` attributes as the spec. `style-hover`, `style-focus`, and `style-active` attributes are pseudo-state styles (`:hover`, `:focus`, `:active`).
- Each file wraps its screens in a **presentation frame** — a fake browser or phone chrome, a page title, a caption, and a "notes" grid at the bottom explaining design decisions. The frame is documentation, **not part of the product UI**. Build only what is inside the device/browser viewport.
- Mobile screens are mounted inside `ios-frame.jsx` / `android-frame.jsx` device bezels. Those are also documentation.

## Fidelity

**High fidelity.** Colors, typography, spacing, copy, and states are final and should be reproduced closely. Where the target codebase already has an equivalent component, use it and match these values through its theming API rather than overriding it ad hoc.

---

## Design tokens

### Color — closed brand palette

Do not introduce colors outside this list. Tints are the semantic color at low alpha.

| Token | Hex | Use |
|---|---|---|
| Arena (page background) | `#F2ECE5` | App/page background |
| Superficie | `#FAF7F2` | Content area behind cards, inset panels |
| Blanco | `#FFFFFF` | Cards, tables, panels, inputs |
| Superficie sutil | `#FDFAF6` | Table headers, field suffixes, inline add rows |
| Hover de fila | `#FDF7F2` | Table row / card hover |
| Palo de rosa (primario) | `#B78380` | Primary buttons, active nav and tab, icons, admin-web links, focus ring |
| Palo de rosa hover | `#A87370` | Primary hover |
| Palo de rosa presionado | `#9C6764` | Primary active |
| Palo de rosa tinte | `#EFE0DC` | Active nav background, avatars, badges |
| Palo de rosa profundo | `#8A5D59` | Text links on Client and Staff screens; admin-web text/icon on the tint |
| Palo de rosa oscuro | `#7A4F4B` | Client and Staff text on Palo de rosa tinte (badges, pending cards); link hover |
| Tinte suave | `#F6EDEB` / `#F7EEE9` | Secondary-button hover |
| Plomo cálido | `#4A4A4A` | Primary text, neutral summary figures |
| Texto secundario | `#6E6663` | Body text, table secondary cells |
| Texto tenue | `#766D69` | Subtitles, labels, helper text |
| Texto muy tenue | `#7A716D` | Placeholders, meta, footnotes |
| Borde fuerte | `#D8C9BB` | Frame borders, input borders, Client and Staff card borders |
| Borde | `#E4D8CC` | Admin-web card and table borders |
| Divisor | `#F2EBE2` | Row separators inside cards |
| Regla | `#EFE7DE` | The rule under a Client or Staff header bar, between list rows drawn on Superficie, and under a card's footer line |
| Icono tenue | `#C4BAB6` | Quiet line icons: the 34px empty-state glyphs, the 19px chevrons of the Perfil menu rows (`18`, `S23`), and the 19px lock on `02`'s disabled shortcut |
| Éxito | `#7C9473` (texto `#5F7457`) | Confirmed, active, attended, income |
| Advertencia | `#C99A4E` (texto `#9A7434`) | Pending, low stock |
| Error | `#B25D4B` (texto `#94493A`) | Cancelled, overdue, no-show, destructive, expenses |
| Deshabilitado | fondo `#E7DCD8`, texto `#B3A9A5` | Disabled buttons and icons |

Status pills: semantic color at **12–16% alpha** as background, the darker text tone as foreground, a **6px dot** of the full color so state does not depend on color alone, fully rounded, 11.5–12px.

### Typography

Fonts: **Lora** (400/500/600, headings, proper names, prices) and **Work Sans** (300/400/500/600, body, labels, controls). Google Fonts.

| Style | Spec |
|---|---|
| Display | Lora 400 · 44/1.1 · `-0.01em` |
| Título 1 | Lora 500 · 30/1.2 |
| Título 2 | Lora 500 · 22/1.3 |
| Precio | Lora 500 · 26 · tabular numerals |
| Cuerpo grande | Work Sans 400 · 17/1.65 |
| Cuerpo | Work Sans 400 · 15/1.6 |
| Etiqueta | Work Sans 500 · 12 · `0.16em` · uppercase |
| Nota | Work Sans 400 · 13/1.5 |

Admin web runs one step tighter: page title Lora 400 · 27, panel title Lora 400 · 22, table cell 14, table header 10.5 uppercase `0.14em`, field label 10.5 uppercase `0.14em`, helper text 11.5.

All numeric columns, money, dates, and counts use `font-variant-numeric: tabular-nums`. Long prose uses `text-wrap: pretty`.

### Spacing, radius, shadow

- Spacing scale in use: 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 24, 26, 32, 40 px.
- Radius: 8px controls, 10–12px admin-web cards and panels, 16px Client and Staff cards and empty states, 14–16px outer frames, 999px pills.
- Shadows: primary button `0 2px 6px rgba(183,131,128,0.22)`; Client and Staff card `0 2px 8px rgba(74,74,74,0.05)`; card hover `0 6px 16px rgba(74,58,48,0.10)`; side panel `-14px 0 34px rgba(74,58,48,0.14)`; dragged card `0 16px 32px rgba(74,58,48,0.20)`; popover `0 12px 28px rgba(74,58,48,0.14)`.
- Focus ring on inputs: `border-color:#B78380; box-shadow:0 0 0 3px rgba(183,131,128,0.15)`.
- Scrim behind side panels/modals: `rgba(74,58,48,0.22)`.

### Buttons

- Primary: `#B78380` fill, white text, radius 8, min-height 52 mobile / 38–46 desktop, weight 500, shadow above; hover `#A87370`, active `#9C6764`, disabled `#E7DCD8`/`#B3A9A5`.
- Secondary: 1px `#B78380` border, transparent fill, `#8A5D59` label on Client and Staff screens (`#B78380` on the admin web); hover tint `#F6EDEB`.
- Tertiary/link: text only. Client and Staff screens use `#8A5D59` (hover `#7A4F4B`), and `#7A4F4B` on Palo de rosa tinte; the admin web keeps `#B78380` (hover `#9C6764`).
- Compact neutral: 1px `#D8C9BB`, `#FAF7F2` fill, `#4A4A4A` text, height 30–38; hover border `#B78380`.
- Destructive: Error `#B25D4B` text/border, hover text `#94493A`, hover tint `rgba(178,93,75,0.10)`.
- Busy (from the tap until the request answers): the button keeps its fill, border, shadow, width, and height; a spinner replaces the label (the native small activity indicator on mobile, a 16px ring turning every 0.8s on the admin web), white on the primary fill and Error `#B25D4B` on the destructive outline; taps are ignored, screen readers hear the label as busy, and it never uses the Deshabilitado colours.
- **One solid button per view.**
- Mobile hit targets never below 44px.

### Unread badges (Client and Staff)

- Count badge: 18px tall pill, min-width 18px, padding 0 5px, `#8A5D59` fill, white Work Sans 11px weight 600 tabular (5.54:1); «9+» above nine; not drawn at zero. On the Client Perfil tab icon it overlaps the top-right corner (top −4px, right −9px) with a 2px white ring; screen readers hear «Perfil, 2 notificaciones sin leer».
- Row count: the «Notificaciones» rows of `18` and `S23` show the same pill at 22px (min-width 22px, padding 0 6px, 12px text), no ring, right before the chevron.
- Dot: 12px `#8A5D59` circle, no number, 2px ring in the header background, on the top-right edge of the staff «Tu cuenta» avatar (`S02`, `S04`, `S11`, `S15`). Staff roles have no tab bar, so the dot is their equivalent of the tab badge.
- Never Error red: red marks rejected receipts and cancelled classes on `19`/`S20`.

### Picker sheets (Client and Staff)

- A bottom sheet that picks one value (`03` and `S13` «Elige una sucursal», `S17` «Hora de inicio» / «Hora de fin») lists every option as a row.
- The selected row carries its label in `#8A5D59` (5.54:1 on white), same family, size and weight as the other rows, and a `#B78380` check on its right; other rows are `#4A4A4A` with no check (`03` keeps the empty check slot so names do not shift).
- Tapping a row picks it and closes the sheet; screen readers hear the row as selected.

### Cards (Client and Staff)

- A card is Blanco, 1px `#D8C9BB`, radius 16, padding 18–20px, with the shadow `0 2px 8px rgba(74,74,74,0.05)`. The cards drawn without the shadow stay flat: `12`'s dates, `17`'s origin, `S03`'s roster, `S05`'s pending card, `S06`'s history, `S12`'s receipt and summary, and `S23`'s groups.
- A selectable card marks selection by its border alone: 2px `#B78380` (`06`'s and `08`'s options) or 1px `#B78380` (`S15`).
- Chips and day pickers round at 12, notices at 10, inputs at 8; none of them is a card.
- An empty state is a dashed 1px `#D8C9BB` box, radius 16, on `rgba(216,201,187,0.14)`, centred: a 26px `#B78380` line icon, a Lora 19 weight-500 title, and a 13px `#766D69` note (`03`, `06`, `16`, `S04`'s search miss, `S06`). The tablet's empty right panel (`S04`) draws no box: the person icon in a 64px circle (1px `#D8C9BB` on `rgba(216,201,187,0.18)`), a Lora 22 weight-400 title, and a 14px `#766D69` helper line up to 340px wide.

### Lists between rules (Client and Staff)

- A read-only list drawn directly on Superficie (`07`, `S22`) puts each item in a row with 16px vertical padding and a 1px `#EFE7DE` rule under every row but the last of its group; no card, no shadow, no chevron.
- The history row: a 38px day column (Lora 20 weight-500 day of the month, zero-padded, over the 10px uppercase `0.1em` `#7A716D` weekday), then the Class Type in Lora 17 weight-500 over «Entrenadora · Sucursal» in 13px `#766D69`, 16px apart.
- Groups: an 11px uppercase `0.16em` `#766D69` heading with a 12px `#7A716D` count on the right («6 clases»), over a 1px `#D8C9BB` rule, 6px above the first row; 30px between groups. The screen opens with «Has asistido a» (`07`) or «Ha asistido a» (`S22`) in 13px `#766D69` over «N clases desde <mes>» in Lora 26 weight-500. The whole record is listed at once; nothing loads on scroll.
- An empty list on the screen (`07`, `19`, `S20`, `S21`, `S22`) centres a 34px `#C4BAB6` line icon (stroke 1.1), a Lora 21 weight-500 title, and, when the prompt asks for one, a 14px `#766D69` note up to 260px wide, with no box behind them.

### Row chevrons (Client and Staff)

- A tappable card or list row ends in a 19px `#B78380` chevron (stroke 1.3, polyline `9.5,5 16.5,12 9.5,19`), vertically centred after the row's text or value: `02`'s full-width «Reservar una clase» shortcut, the Session rows of `03`, `S07`, and `S13`, `16`'s «Tu crédito», the agenda rows of `S02` and `S15`, `S04`'s results, `S11`'s payments, `S16`'s blocks. `02`'s two half-width tiles carry none.
- The Perfil menu rows of `18` and `S23` end in the same chevron in `#C4BAB6`, after the row's value or unread count.
- The «Sucursal:» picker of `03`, `S07`, and `S13` ends in a 16px `#766D69` chevron pointing down (`6,9.5 12,15.5 18,9.5`); `02`'s disabled shortcut ends in a 19px `#C4BAB6` lock instead of the chevron.
- Rows between rules (`07`, `S22`) and the notification rows of `19` and `S20` carry no chevron.

### Loading state (Client and Staff)

- A screen's first load shows only `emma-logo.png` (transparent, 800 × 333), centred in the content area between the header and the tab bar on Marfil: 240px wide on phones, 300px on tablets. No text, card, or spinner; the header and tab bar stay usable.
- Nothing for the first 400ms, then a 300ms ease-out fade-in, then an endless breath of 2.8s (1.4s in, 1.4s out, ease-in-out) between opacity 0.55 / scale 0.96 and opacity 1 / scale 1. Content replaces it with no exit animation.
- Reduce Motion: no fade and no breath; the still logo appears after the same 400ms.
- Announced as progress with the screen's Spanish label («Cargando clases»); the image itself is not read.
- Not for busy buttons, pull-to-refresh, the Promotions placeholder card, image placeholders, or errors.
- Every list refreshes in the background when it regains focus (a tab comes back, a screen it opened closes) and on pull, with the native pull-to-refresh control in Palo de rosa; what is on screen stays until the fresh answer replaces it.

### Launch screen (Client and Staff)

- From the tap on the icon until the first screen is ready (Login, or the saved session's first screen), both apps show `emma-logo.png` centred on `#F3E9E7`, the icons' blush edge tone; then a 300ms fade. Light mode only, nothing else on the screen.
- iOS draws the logo 240pt wide on phones and tablets. Android draws it 160dp wide: on Android 12+ inside the system's 192dp icon circle (invisible on the same background), the widest that fits without clipping; older Android centres the same 160dp logo without the circle.
- A native screen: it changes only with a store build, never with an over-the-air update.

### Home shortcuts (`02`)

- Under an 11px uppercase `0.16em` `#766D69` «Accesos rápidos» eyebrow, a full-width «Reservar una clase» card (padding 18, gap 14) holds a 44px tile on `rgba(216,189,184,0.28)` at radius 12 with a 22px `#B78380` calendar (stroke 1.3), the title in Lora 17 weight 500 over a 13px `#766D69` note, and the 19px chevron.
- Under it, two half-width cards in a 12px grid («Evaluación nutricional», «Mis referidos»): a column (padding 18, gap 10) with a 22px `#B78380` icon, a Lora 16 weight-500 title, and a 12px `#766D69` note; no chevron.
- Without an active Plan the full-width card is disabled: Arena `#F2ECE5` with a 1px `#E7DCD8` border at the same radius 16, the tile on `rgba(74,74,74,0.05)`, the icon and title in `#B3A9A5`, the note unchanged, and the 19px `#C4BAB6` lock in place of the chevron.

### Branch picker pill (`03`, `S07`, `S13`)

- A 44px pill (1px `#D8C9BB`, Blanco, padding 0 16, gap 10, radius 999) with a 17px `#B78380` pin, «Sucursal: » and the Branch name in 14px `#4A4A4A` (the name at weight 500), and the 16px `#766D69` chevron pointing down; it opens the picker sheet above. `S13` offers «Todas las sucursales» as a name.

### Seat pills (`03`, `04`, `06`, `S02`, `S07`, `S08`, `S13`)

- The pill on a Session row or detail says how many places remain or that none does; the number or word carries the state, so it takes no dot.
- Seats remain («N cupos», «Con cupos»): Palo de rosa tinte `#EFE0DC` behind Palo de rosa oscuro `#7A4F4B`, the badge pair of the palette table. Full («Lleno», «Completa», «Llena»): `rgba(216,201,187,0.34)` behind Texto secundario `#6E6663`, never Error red and never Éxito green. 12px, weight 500, fully rounded.
- `S08`'s capacity summary («N de M cupos disponibles» beside the pill) is a flat Blanco card: 1px `#D8C9BB`, radius 16, padding 16px 18px, no shadow. The pill alone carries the state, so the box takes no Éxito or Error tint.
- `S07` marks the Session the Client already holds a Booking in with «Ya reservada» on the full-class tones (`rgba(216,201,187,0.34)` / `#6E6663`), and `S08` then draws the note «La clienta ya tiene esta clase reservada.» instead of «Reservar»; a Waitlist entry keeps the count (UX-003).
- `04`'s capacity block («**N** de M cupos disponibles» with the number in Lora 18 weight 500, then «N reservados» in 12px `#7A716D` or the «Lleno» pill on the right, and the 7px bar under the row) draws no card. The bar's track is Palo de rosa tinte `#EFE0DC` under a Palo de rosa `#B78380` fill sized to the booked share; when full the fill is Icono tenue `#C4BAB6`, the count reads «0 de M», and the pill alone names the state.

### Search result rows (`S04`)

- A result row (padding 16px 18px, gap 14) is a 42px circle on `rgba(216,189,184,0.4)` with the Client's first letter in Lora 16 `#8A5D59`, the name in 16px `#4A4A4A` over «phone · email» in 13px `#766D69`, a «Pendiente» tag while the account is pending, and the 19px `#B78380` chevron. The contact stays on one line and is trimmed with an ellipsis when the row is narrower than it.
- On the tablet the rows sit in the fixed 392px left panel (24px padding, 344px of rows) beside the detail panel; the phone draws them at the screen's width.

---

### Impersonation banner (Staff)

- While an Administrator sees the app as a Staff Member (FUT-001, ADR-0100), a fixed 52px strip on `#8A5D59` with white text sits above every screen's header: an eye icon, «Viendo como {name}» (14px, weight 500) over «{role} · Quedan {n} min» (12px at 0.85 opacity), both trimmed with an ellipsis, and «Salir» (weight 600, 44px target, pressed `rgba(255,255,255,0.14)`, label «Salir de ver como {name}»).
- «Salir» or the 30-minute expiry returns to `S11` with the transient notice strip («Dejaste de ver la app como {name}.» / «Terminó el tiempo para ver la app como {name}.»). The header avatar shows the Staff Member's initials meanwhile.

---

## Admin web — shell (shared by AW02–AW29, AW31, AW33)

Reference width **1440px**; a 420px narrow-browser variant is drawn for every screen.

- **Top bar**, 44px, white, bottom border `#E4D8CC`: brand wordmark "Emma" (Lora 21) in a 236px cell with a right border, then on the right a **branch selector** (`Sucursal Equipetrol`, pin icon, chevron) and a **user menu** (26px `#D8BDB8` avatar with initials, name, chevron).
  - The branch selector scopes most pages. Exceptions: **AW11 Nómina**, **AW21/AW22 Clientes**, **AW26 Referidos**, **AW27 Créditos**, **AW28/AW29 Pagos** and **AW15 Categorías de gasto** are not branch-scoped (the selector stays visible for shell consistency but is ignored — those records belong to the studio, not a branch); **AW16 Reporte** replaces the top-bar selector with its own selector that adds "Todas las sucursales".
  - **AW19 Sucursales** is the list that feeds the top-bar selector.
- **Sidebar**, 236px, white, right border `#E4D8CC`, padding 18px/12px, 4px gaps. Top-level items are 36px rows with a 15px icon; group labels are 10px uppercase `0.18em` `#7A716D`; group children are 32px rows indented to 22px left padding. Sections auto-expand; the active group label turns `#B78380`.
  - Order: **Horario** · *Catálogo* (Tipos de clase, Planes, Sucursales) · *Back Office* (Clientes, Pagos ⟨badge 6⟩, Insumos ⟨badge 3, warning tint⟩, Evaluaciones nutricionales, Personal, Nómina, Gastos, Categorías de gasto) · **Reporte** · *Promociones* (Promociones, Referidos, Créditos). No "Descuentos" at any level — it does not exist in the product (ADR-0007).
  - Descuentos was dropped for good — see ADR-0007; do not reintroduce it here without a new ADR superseding that one.
  - Active item: `#EFE0DC` background, `#8A5D59` text, weight 500. Hover: Hover de fila `#FDF7F2` background, `#4A4A4A` text.
  - Counter badges: 18px tall pill, `#EFE0DC`/`#8A5D59`, or warning `rgba(201,154,78,0.18)`/`#9A7434`.
- **Main area**: `#FAF7F2`, padding 24px 26px 32px, 18px column gap. Header row = page title (Lora 27) + one-line subtitle (12.5 `#766D69`) on the left, primary action(s) on the right.
- **Filter row** (where present): 34px search field (max 300px, magnifier icon, placeholder-style text) plus 34px dropdown/filter chips.

### Table convention

White card, 1px `#E4D8CC`, radius 12, `overflow:hidden`.
- Header row: `#FDFAF6`, bottom border `#E4D8CC`, padding 11px 20px, 10.5px uppercase `0.14em` `#7A716D`.
- Body rows: padding 15px 20px, bottom divider `#F2EBE2` (last row none), row hover `#FDF7F2`. Whole row is the link into the edit panel.
- Columns are CSS grid with `minmax(0,Nfr)` tracks and 16px gap. Money and dates are right-aligned and tabular.
- Primary cell is 14px weight 500; an optional 11.5px `#7A716D` sub-line carries context (threshold, role, description).
- Footer strip under the card: 12px `#7A716D`, count on the left, a clarifying rule on the right.

### Side-panel form convention

Panels are **408px** wide, absolutely positioned over the dimmed (`rgba(74,58,48,0.22)`) list, `border-left:1px solid #E4D8CC`, shadow `-14px 0 34px rgba(74,58,48,0.14)`. On narrow widths the panel becomes a **full-screen sheet**.

- Header: 18px 22px, bottom border `#EFE6DC`; Lora 22 title + 11.5px context line; 30px square close button (1px `#E4D8CC`, `#FAF7F2`, hover border `#B78380`).
- Body: padding 20px 22px, 18px gaps. Field = 10.5px uppercase label + 44px control (48px on mobile) + optional 11.5px `#7A716D` helper.
- Inputs: 1px `#D8C9BB`, radius 8, white, 14px text; focus ring as above. Unit suffixes ("min", "pers.", "unid.") and currency prefixes ("Bs") are fixed segments inside the control with a `#EFE6DC` divider and `#FDFAF6` fill.
- Password inputs carry an eye button inside the right end (20px outline eye, 1.3px stroke, `#766D69`; 44px touch target on mobile, 40px on the admin web; right padding 52px/48px). Every field starts hidden; a tap shows the text with the eye-off and a second tap hides it, keeping the value and the cursor. Its label is the action: «Mostrar contraseña» / «Ocultar contraseña» (a real `button type="button"` with `aria-pressed` on the web).
- Two short numeric fields share a row via `grid-template-columns:minmax(0,1fr) minmax(0,1fr)` (prevents overflow).
- Read-only values render as a `#FAF7F2` row with 1px `#EFE6DC`, a padlock icon, and an explanation.
- Footer: padding 18px 22px, top border `#EFE6DC`, full-width primary button (46px).

### Recovery state

- When a page fails while drawing, the main area shows the plain empty state in its place, directly on Superficie with no card and no icon: «Algo salió mal» in Lora 22, the 15px `#766D69` note «No pudimos mostrar esta página. Inténtalo de nuevo; si vuelve a pasar, recarga la página.» up to 360px wide, and the large «Reintentar» primary button at least 220px wide, centred. It replaces only the content area (the sidebar and the top bar stay) and «Reintentar» draws the page again; the sidebar still moves to any other page. The startup page «No pudimos conectar con el servidor» stays for the session probe alone.
### Loading states

- **First load:** from the first paint until the session probe answers, the viewport is Crema `#F2ECE5` with only `emma-logo.png` centred in it (300px wide, 240px on a phone), with no delay: it is the web's splash screen. The first page replaces it with no exit animation.
- **Page switch:** when a sidebar entry's page has not arrived after 400ms, the main area shows only the logo centred in its content area on Superficie `#FAF7F2` (300px wide at 1440px, 240px at 420px); the sidebar, the top bar, and the skip link stay. The page replaces it with no exit animation.
- Motion and Reduce Motion as the mobile loading state above (300ms fade-in, a 2.8s breath between opacity 0.55 / scale 0.96 and 1 / 1; still under Reduce Motion). Announced as a status: «Cargando la administración» and «Cargando la página». Not for the in-page «Cargando …» notices, busy buttons, or the recovery state.

---

## Screen inventory

### Client app (mobile)

| File | Screen | Purpose |
|---|---|---|
| `01` | Iniciar sesión | Email + password login, registration with «Confirmar contraseña», «Revisa tu correo» verification states, incorrect-credentials and throttled login, and the registration form's temporary device or network limit |
| `02` | Inicio | Promotions carousel, next class, plan status; one full-width 16:9 card per page with position dots, a loading placeholder, the section hidden without published Promotions, a 720 px card on tablet |
| `03` | Reservar | Browse sessions by day |
| `04` | Detalle de sesión | Session detail + book |
| `05` | Mis reservas | Upcoming bookings |
| `06` | Reprogramar | Move a booking |
| `07` | Historial de clases | Past classes |
| `08` | Elegir plan | Plan catalog |
| `09` | Detalle del plan | Plan detail; the total is the price drawn minus the Credit applied, never below zero |
| `10` | Pago | Payment — transfer to the studio QR + receipt upload (no cash); the QR is the only transfer instruction, drawn whole and tappable, with «Ampliar» and «Guardar QR» under it and a light full-screen «QR ampliado» view |
| `11` | Estado del pago | Pending/confirmed/rejected states |
| `12` | Mi plan | Active plan, sessions left, expiry |
| `13` | Evaluación nutricional | Book a nutrition assessment: only days of months not yet used in the next 30 days, the Branch (and Nutritionist) per turno when there are several, turnos close 3 h before they start; used-month state only when no unused month has turnos, and a no-active-plan state with «Ver planes» (`08`); the used-month title names the used month («de este mes» or «de septiembre») |
| `14` | Confirmar evaluación | Confirmation step; cancelling is from `15` («desde Mis evaluaciones») |
| `15` | Mis evaluaciones | Assessment history: one per month, so up to two «Próximas» across a month boundary; «Cancelar» outside the last 3 h («Ya no se puede cancelar» inside), and the sheet says the month is freed; the sheet frees «este mes» or the Evaluation's month by name; the empty state offers next month's free Evaluation once this month's took place |
| `16` | Mis referidos | Referral code + status |
| `17` | Mi crédito | Credit balance and movements |
| `18` | Perfil | Profile and settings; «Evaluación nutricional» (opens `13`) sits between «Mi plan» and «Mis evaluaciones»; the «Notificaciones» row shows the unread count before its chevron; the summary card's 56 px circle shows the Client's photo (centre crop) or her initials; the quiet Error-tone link «Cerrar mi cuenta» under «Cerrar sesión» is the only route to `24`; a «Promociones» card with the «Recibir promociones de Emma Pilates» switch (ADR-0098) sits between the menu and «Cerrar sesión» |
| `19` | Notificaciones | Notification list — eight types, including the studio-cancelled Evaluation (opens `15`; its last sentence names the freed month, «otra este mes», or «otra para octubre» when the Evaluation was in a later month) and the first-90-days message (opens nothing) |
| `20` | Recuperar contraseña | Request a reset link by email; neutral sent and temporary-limit states |
| `21` | Crear contraseña | Page opened by an emailed link: Activar cuenta or Restablecer contraseña, plus expired and removed-invitation states |
| `22` | Editar perfil | Edit name, email, phone; a different email is asked for, not saved: the field returns to the current address and the «Revisa tu correo nuevo» card (Reenviar correo · Cancelar cambio, «Te enviamos otro enlace.») stays until the link from the new mailbox is opened; the link's screen («Confirmando tu correo», then Tu correo cambió · Enlace vencido · Enlace no válido · Correo no disponible, «Continuar») opens with or without a session; the chosen photo previews in the circle as its centre crop («Se recorta al centro en forma de círculo.»); «Cambiar foto» (photo library) and, with a photo, «Quitar foto» (no confirmation); «Subiendo foto…» while it uploads and the photo saves on its own, apart from «Guardar cambios»; upload and removal errors |
| `23` | Cambiar contraseña | Self-service change, session open |
| `24` | Cerrar mi cuenta | Close the Account for good from `18`: the consequences that apply (future bookings and evaluation cancelled, waitlists left, plan ended without refund, credit forfeited, every session closed, email freed), a note that the name, email, phone, and photo are erased while payments and classes stay without them, an unticked «Quiero seguir recibiendo promociones de Emma Pilates» checkbox, password re-entry, Error-outline button; refused while a transfer payment awaits review; ends on `01` with a success notice |

### Staff app (mobile)

| File | Screen | Role |
|---|---|---|
| `S01` | Iniciar sesión | All staff — email + password, incorrect-credentials and throttled states |
| `S02` | Mi agenda | Trainer |
| `S03` | Lista de asistentes | Trainer — attendance marking |
| `S04` | Buscar cliente | Front desk; the Coordinator's root has no «Nuevo cliente» and offers «Cancelar una clase» (IDN-009) |
| `S05` | Nuevo cliente | Front desk — email + optional phone, activation-link invitation; «Crear cuenta» opens `S06`; the self-registered state's «Ver cliente» opens her `S06` |
| `S06` | Resumen del cliente | Front desk — also manages a pending invitation, or offers a new verification link to a pending Client who registered herself; while her Plan is active «Registrar pago en efectivo» is disabled with «Podrá comprar otro plan cuando este termine.» (UX-003); for the Coordinator there is no cash sale (IDN-009) |
| `S07` | Reservar una clase | Front desk (on behalf of a client); the Session she already holds a Booking in carries the neutral «Ya reservada» pill instead of the seat count (UX-003) |
| `S08` | Detalle de sesión | Front desk; a Session she already booked shows «La clienta ya tiene esta clase reservada.» in place of «Reservar» (UX-003) |
| `S09` | Elegir plan | Front desk |
| `S10` | Confirmar pago en efectivo | Front desk |
| `S11` | Pagos pendientes | Administration |
| `S12` | Revisar pago | Administration — approve/reject |
| `S13` | Cancelar una clase | Administration |
| `S14` | Cancelar sesión | Administration |
| `S15` | Mi agenda | Nutritionist; the selected card offers «Cancelar evaluación» (confirmation sheet, «Evaluación cancelada» notice) |
| `S16` | Mi disponibilidad | Nutritionist; block cards carry «Desde el …» / «Hasta el …» when a block starts later or ends, and the Branch when blocks span Branches |
| `S17` | Formulario de horario | Nutritionist; Día, «Sucursal» (only with several Branches), 15-minute Horario with at least one 45-minute turno, «A partir del» / «Aplicar cambios desde» (from today); confirmation sheets «¿Aplicar el cambio?» (when bookings exist) and «¿Quitar este horario?» (always), which keep booked Evaluations |
| `S18` | Recuperar contraseña | All staff — reset link by email |
| `S19` | Crear contraseña | All staff — Activar cuenta or Restablecer contraseña from an emailed link |
| `S20` | Notificaciones | All staff — reached from `S23`'s «Notificaciones» row and from a push, filtered by role; six types, including the Client-cancelled Evaluation for the Nutritionist (opens `S15`) |
| `S21` | Reservas de la clienta | Front desk |
| `S22` | Historial de la clienta | Front desk |
| `S23` | Perfil | All staff — read-only data, «Notificaciones» (opens `S20`, with the unread count), change password, log out; Administración also has «Ver la app como…» (opens `S24`); the Coordinator reads «Coordinación» and «Todas las sucursales» (IDN-009) |
| `S24` | Ver la app como… | Administration — the active Trainers, Assistants, and Nutritionists by Role; a row confirms in a sheet and the app re-draws as that Role for 30 minutes under the impersonation banner (FUT-001); the Coordinator appears under «Coordinación» (IDN-009) |
| `S28` | Para contactar (Coordinación) | The first-90-days contact list; «Abrir WhatsApp» opens WhatsApp with the Client's number, «Contactada» removes her; reached from `S04` |

### Admin web (desktop)

| File | Screen | Notes |
|---|---|---|
| `AW01` | Iniciar sesión | Centered card, email + password, error and throttled states |
| `AW02` | Horario | Week grid of sessions; establishes the shell; an empty hour of a day column opens `AW03` in create mode (hover and focus: Hover de fila fill, dashed Palo de rosa border, «+ HH:00»); an Éxito line names the result of the last change; full Sessions read «Llena · N en espera» in Advertencia; the Coordinator's frames draw her sidebar and the «Esa sección es solo para administración.» notice (IDN-009) |
| `AW03` | Formulario de sesión | Side panel; opened from an empty `AW02` slot it starts with that date and hour (and, under «Cada semana», that weekday and date) filled in; creating chooses «Una sola vez» (Fecha) or «Cada semana» (one or more «Días y horas» rows, each a weekday, a time, and its own «Duración» box (60 minutes to start), «+ Agregar día» up to seven and a remove button per row, repeated or overlapping rows marked on the row; one shared «Vigente desde» in Bolivia time; every row saved together or none, each its own weekly schedule afterwards; Sessions generated 30 days ahead); every create and edit frame carries «Duración» (5–240 minutes, 60 to start on create; a Class Type has no duration); editing a Session of a weekly series asks «Solo esta sesión» (an exception) or «Esta y las futuras» (replaces only unbooked Sessions from «Vigente desde»); seats booked + waitlist count, capacity constraints, trainer notification; the Class Type of an existing Session is read-only; «Terminar la serie» ends a weekly schedule from a chosen date (unbooked Sessions cancelled); «Cancelar sesión» appears only for a Session with Bookings (an empty one shows «Sin reservas: si sigue vacía, el sistema la cancela sola 2 horas antes de empezar.»), is always one Session, asks no reason, refunds every booking and notifies the waitlist too |
| `AW04` | Planes | Catalog table; Visibilidad pill (Éxito «Visible» / neutral «Oculto») and filter; prices with centavos |
| `AW05` | Formulario de plan | Side panel; «Orden en la app»; edit keeps running prices and offers «Ocultar en la app» / «Mostrar en la app» |
| `AW06` | Tipos de clase | Catalog table (Nombre, Capacidad, Equipo necesario; a Class Type has no duration); Estado filter; archived Class Types carry a neutral «Archivado» pill |
| `AW07` | Formulario de tipo de clase | Side panel; required «Descripción» (one or two sentences shown on the client's session detail) after Nombre; a full-width «Capacidad» with its fixed «pers.» suffix and no duration (each Session chooses its own in `AW03`); edit offers «Archivar tipo de clase» (refused while a weekly schedule uses it) |
| `AW08` | Insumos | Branch stock table; "Stock bajo" warning pill; four actions (nuevo insumo, registrar retiro, registrar reposición, historial de retiros); «Registrar reposición» opens an `AW10`-style panel; subtitle «Sucursal X · N con stock bajo», an Éxito line after each change, an empty-Branch frame |
| `AW09` | Formulario de insumo | Stock editable only on create; read-only + padlock on edit; «Archivar insumo» (edit only) with a confirmation; the stock is typed once on create; a duplicate active name is refused on Nombre |
| `AW10` | Registrar retiro | Two-field fast-entry panel; stock shown per option; «Máximo: N unid.» and the «Solo hay N unid. en stock.» error; options read «Detergente (12 unid.)»; an empty-Branch state disables «Registrar» |
| `AW11` | Nómina | Salary payments; **not** branch-scoped; studio-wide subtitle, Empleado filter |
| `AW12` | Formulario de pago de sueldo | Empleado / Monto / Fecha only; every Staff Member of any Role, a deactivated one still choosable; the date cannot be after today |
| `AW13` | Gastos | Branch expenses; month total in the subtitle; subtitle «Sucursal X», Categoría filter, empty state |
| `AW14` | Formulario de gasto | Categoría + inline "+ Nueva categoría" / Monto / Fecha; a quiet line says which Branch the Expense belongs to; the inline category row adds with a compact neutral «Agregar» |
| `AW15` | Categorías de gasto | Plain list, inline add row, delete disabled when in use; studio-wide; used categories say «En uso»; deleting asks first; refusals for a category in use and a taken name |
| `AW16` | Reporte de ingresos y gastos | Own date range + "Todas las sucursales"; 3 stat tiles, bar chart, category breakdown; «Nómina» only across all Branches, and a single-Branch frame with its caption; Desde / Hasta / Sucursal controls (archived Branches included), centavos everywhere, every month on a rounded scale with a hover popover, «Totales por mes» beside the categories, empty and invalid-range states |
| `AW17` | Promociones | Drag-to-reorder card list (order = carousel order); each card shows its derived state: Borrador, Programada, Activa, Finalizada (a deleted Promotion is archived and leaves the list); empty frame, an Éxito result line, «Sin imagen» for a draft without image; at 420 px headlines wrap and windows keep «Del … al …»; keyboard reordering on the handle; a «Contactos para promociones» button opens `AW35` |
| `AW18` | Formulario de promoción | Image upload, título, descripción, date range; «Guardar borrador» / «Publicar» (disabled until image, title, description, and both dates exist); a published Promotion offers «Guardar cambios» / «Dejar de publicar», and changing or removing its image unpublishes it on save with a warning; accepts JPG, PNG or WEBP; «Imagen actual · ancho × alto»; a non-16:9 file previews with the cropped bands dimmed; refused-file reasons under the drop target; «Eliminar promoción» with a confirmation in every edit |
| `AW19` | Sucursales | Two-column table (Nombre / Dirección); feeds the top-bar selector; no delete; Estado filter; archived Branches carry a neutral «Archivada» pill |
| `AW20` | Formulario de sucursal | Side panel; nombre + dirección only; edit mode carries a fixed note about linked records; edit offers «Archivar sucursal» (refused while Sessions or a weekly schedule depend on it) |
| `AW21` | Clientes | Read-only directory, 4 columns, search only, paginated; **no primary action**; after a closure from `AW22` it reloads without her and shows «Cuenta de … cerrada.»; a Client who never bought a Plan shows the neutral «Sin plan» pill |
| `AW22` | Detalle de cliente | Read-only side panel: contacto, plan, crédito, referidos; **no Guardar**; one quiet footer action «Cerrar cuenta» (Error outline) opening a consequences confirmation, refused while a transfer payment awaits review; a pending Account shows «Pendiente de activación» under «Cliente desde»; a deactivated Account shows the neutral «Cuenta desactivada» pill and no «Cerrar cuenta»; «Editar perfil» corrects the name and phone for the Administrator and the Coordinator; the Coordinator's panel has no Crédito row and no «Cerrar cuenta» (IDN-009) |
| `AW23` | Personal | Team accounts, 4 columns, role filter; row → `AW24`; Estado column (Activo · Pendiente · Desactivado); the Role stays a Divisor tag; the Rol filter is the only filter (no name search); the Coordinador Role (IDN-009) and a read-only view for the Coordinator |
| `AW24` | Formulario de personal | One role (2×2 grid), assigned branches, email + optional phone, activation-link invitation and pending states; edit shows the contact read-only and changes only Role and Branches; «Desactivar cuenta» with a confirmation; your own and a deactivated Account open read-only; no «Restablecer contraseña»; five Roles, Coordinador with every Branch implicitly (IDN-009) |
| `AW25` | Evaluaciones nutricionales | Read-only list, date range + nutritionist filter, no status column; empty state; follows the top-bar Branch; Horario's week stepper; «Primera evaluación» / «Seguimiento»; one labelled card per Evaluation at 420 px |
| `AW26` | Referidos | Read-only, 4 columns, Crédito otorgado / Pendiente pill; studio-wide counts whatever the search; no-results state |
| `AW27` | Créditos | Read-only, 3 columns, right-aligned tabular amounts, total row; four movements (Crédito ganado · Reservado para un pago · Usado en un pago · Devuelto al saldo); the total shows only without a search; empty and no-results states |
| `AW28` | Pagos | Studio-wide transfers; search + status filter (default Pendiente); pending row → `AW29`; a Payment reduced by Credit shows «con Bs 60,00 de crédito» under the amount; empty («No hay pagos pendientes.») and no-results frames |
| `AW29` | Revisar pago | Review panel: summary, large receipt, Confirmar pago / Rechazar (+ mandatory reason); Precio del plan and Crédito aplicado under the amount when Credit applied; «Confirmar pago» asks first; already-decided, active-plan refusal, and receipt-unavailable/unloaded states; the viewer is captioned «Comprobante · JPG» |
| `AW30` | Recuperar contraseña | Request a reset link + neutral "link sent" and temporary-limit states |
| `AW31` | Retiros e insumos consumidos | Withdrawal history behind `AW08`; «Volver a Insumos», month arrows (forward disabled on the current month), archived Supplies in the filter, «Consumo del mes» |
| `AW32` | Crear contraseña | Page opened by an emailed link: Desde una invitación or Restablecer contraseña, plus expired and removed-invitation states |
| `AW33` | Menú de usuario y cambiar contraseña | Top-bar user menu overlay, change-password side panel, log-out confirm; the Coordinator's menu reads «Coordinación» (IDN-009) |
| `AW34` | Selector de sucursal | Not a page: the open states of the top-bar branch control (branches come from `AW19`); picking one closes the popover and reloads the current page in that scope |
| `AW35` | Contactos para promociones | List of the live Clients who agreed to promotions in Perfil (ADR-0098) and the Promotion Contacts kept for former Clients who asked to keep receiving them (ADR-0097), newest consent first, search only, a «Tipo» column with «Activa» and «Cuenta cerrada» pills; «Exportar CSV» downloads every contact (audited); a per-row «Dejar de enviar» confirmation closes a live Client's consent (her Account stays) or erases a former Client's contact; reached from `AW17`, no sidebar item; empty, no-results, and after-erasing frames |
| `AW39` | Para contactar | The first-90-days contact list for the Administrator and the Coordinator; «Abrir WhatsApp» opens `wa.me`, «Contactada» removes the Client; no amount |

---

## Interactions & behavior

**Navigation — admin web**
- Sidebar item → page. `+ Nuevo …` and any table row → the matching side panel (`AW04→AW05`, `AW06→AW07`, `AW08→AW09`, `AW11→AW12`, `AW13→AW14`, `AW17→AW18`, `AW19→AW20`, `AW21→AW22`, `AW23→AW24`, `AW28→AW29`). Close icon or scrim dismisses the panel.
- `AW02→AW03` from an empty slot of the desktop week grid (create mode with Fecha and Hora prefilled in Bolivia time, the top bar's Branch); the 420 px day list keeps only «+ Nueva sesión».
- `AW01→AW30` via "¿Olvidaste tu contraseña?". The emailed links open `AW32`: an activation from `AW24` returns to `AW01` with «Tu cuenta está activa. Inicia sesión con tu nueva contraseña.» and no session; a password reset revokes older sessions and lands on `AW02` with a new one. A throttled `AW01` shows «Demasiados intentos. Intenta de nuevo en un momento.» with the server-provided wait and never says the account is locked.
- `AW08→AW31` via "Ver historial de retiros"; the back link returns to `AW08`.
- Sidebar «Para contactar» → `AW39`, for both Roles.
- The top-bar user cell opens the `AW33` menu overlay (change-password side panel, log-out confirm) from any shell page.
- The Coordinator (ADR-0102) sees Horario, Clientes, Para contactar, and Personal only; a money page opened by address returns to Horario with «Esa sección es solo para administración.» No amount («Bs») appears on any page she can open (IDN-009).
- `AW22` → «Cerrar cuenta» opens a confirmation that lists what the closure does to that client; **Volver** / **Cerrar cuenta** (Error outline). A pending transfer keeps the dialog open with a refusal and a link to `AW28`; a completed closure returns to `AW21` with an Éxito line.
- `AW17` → «Contactos para promociones» opens `AW35`; `AW35` → «← Promociones» returns to `AW17`. «Dejar de enviar» opens a confirmation (**Volver** / **Borrar contacto**, Error outline); a completed erasure stays on `AW35` with an Éxito line.
- Read-only pages with no primary action: `AW21`, `AW22`, `AW25`, `AW26`, `AW27`, `AW28`, `AW31`, plus `AW16`.
- `AW08` has four actions, in this order: **+ Nuevo insumo** (primary), **Registrar retiro** (outlined — it subtracts stock), **Registrar reposición** (outlined — it adds units, never money; same panel as `AW10` with «Cantidad repuesta») and **Ver historial de retiros** (link → `AW31`).

**Navigation — client app**
- Four-tab bar: Inicio · Reservar · Mis Reservas · Perfil. Child screens replace the tab bar with a header and a back arrow.
- With unread notifications, the Perfil tab carries the unread count badge on its icon on every screen that draws the tab bar, whichever tab is active (`02` and `18` draw it with 2; the other frames show the zero state). `02`'s header avatar has no dot.
- `01→20` via "¿Olvidaste tu contraseña?". Email is the only login, registration, and recovery identifier; phone is optional contact data added later in `22`. Registration asks for the password twice and shows «Las contraseñas no coinciden.» under «Confirmar contraseña», as `21` and `23` do. When the device or network request limit is full, the registration form shows the neutral clock notice above the fields («Demasiadas solicitudes. Intenta de nuevo en un momento; si ya recibiste un enlace, sigue sirviendo.», «Podrás intentarlo en m:ss.») and keeps «Crear cuenta» disabled until the wait ends; nothing is sent and the address is never named.
- A wrong email or password reads «El correo o la contraseña no son correctos.» on `01`, `S01`, and `AW01`: one form-level message that never names the field or says whether the email has an Account.
- `01` registration → «Revisa tu correo» (no tab bar, no route to `02`): the submitted address with «Cambiar correo», «Reenviar correo», «Volver a iniciar sesión», and a quiet «Cancelar registro» with confirmation. The link expires in 24 hours; the pending registration is removed after 7 days without verification, correction, or resend, after which «El registro venció» sends the person back to register. Opening the link verifies the email but does not sign in.
- Emailed links open `21`: **Activar cuenta** (from an `S05` invitation, 7-day links, removed after 30 days of inactivity) returns to `01` without a session; **Restablecer contraseña** (from `20`, 30-minute links) lands on `02` with a new session. Expired recovery links return to `20`.
- `18→22` (Editar perfil) and `18→23` (Cambiar contraseña); both return to `18`.
- `18→24` (Cerrar mi cuenta) through the quiet Error-tone link under «Cerrar sesión»; the back arrow and «Cancelar» return to `18`, and a completed closure signs the client out onto `01` with the notice «Cerramos tu cuenta. Gracias por entrenar con nosotras.»
- Booking and assessment confirmations are acknowledged on arrival, not on a result screen: `04→05` and `14→15` land with a transient Éxito-tinted notice strip under the header (check glyph + "Reserva confirmada" / "Evaluación confirmada" and the class, day and time in the Nota style). It fades after a few seconds or on first scroll and never returns for that record; while it shows, the new card carries a 3px Éxito left edge so it can be found in the list. No button, no dismiss control. `05` adds one muted balance line ("Te quedan 7 clases en tu plan."); `15` has none — an assessment consumes no class allowance.
- `10`'s QR is drawn whole at its own proportions (never cropped). Tapping it or «Ampliar» opens «QR ampliado», a light full-screen view closed by «Cerrar» or the back gesture. «Guardar QR» (on `10` and in the view) adds the image to the photo library, asking only for permission to add photos, so the Client can pick it with their bank app's «QR desde galería»; it confirms with «QR guardado en tus fotos.» or explains a refusal.

**Navigation — staff app**
- No tab bar for any role. Each role lands on its own root — `S02` Trainer, `S04` Front desk, `S11` Administration, `S15` Nutritionist — and navigates in depth from a header with a back arrow.
- `S01→S18` via "¿Olvidaste tu contraseña?". Emailed links open `S19`: **Activar cuenta** (from an `AW24` invitation) returns to `S01` without a session; **Restablecer contraseña** lands on the role root (`S02`, `S04`, `S11`, `S15`) with a new session.
- `S05` sends an activation link instead of a password and then opens `S06` for the new Client; it also draws the self-registered and other-account states (the self-registered state's «Ver cliente» opens her `S06`). The same email in the same creation flow opens that pending Client's `S06` with «… ya estaba pendiente de activación. Le enviamos un enlace nuevo y conservamos sus datos.» When the staff Account's email limit is full, the form shows the neutral clock notice above the fields («Enviaste muchos correos en poco tiempo. Espera un momento para enviar otro; los enlaces que ya enviaste siguen sirviendo.», «Podrás intentarlo en m:ss.») and keeps «Crear cuenta» disabled until the wait ends; nothing is created or sent.
- `S06` manages a pending invitation on every visit (after `S05` or from `S04`): a card above the plan with the email and «Cambiar correo» («Nuevo correo», «Guardar correo», «Cancelar»), the 7-day link expiry and the 30-day removal as separate lines, «Reenviar enlace» (a limited resend shows the server-provided wait and keeps the current link; the staff Account's own email limit uses the same notice with «Enviaste muchos correos en poco tiempo…» and «Podrás enviarlo en m:ss.», for «Reenviar enlace», «Cambiar correo», and «Enviar enlace de verificación» alike), and a quiet «Cancelar invitación» that confirms in a sheet and returns to `S04`; a Client with payments or bookings shows «La cuenta ya tiene pagos o reservas, así que la invitación se mantiene.» instead. The card disappears once the Client activates. A pending Client who registered herself has no invitation: `S06` shows `S05`'s verification notice with «Enviar enlace de verificación» only (sent and limited lines as above), on the phone and in the tablet's right panel, until she verifies.
- `S06→S21` (Reservas de la clienta) and `S06→S22` (Historial de la clienta).
- The Coordinator (ADR-0102) lands on `S04` without «Nuevo cliente» and with «Cancelar una clase» (`S13`/`S14`); `S06` has no cash sale for her; she acts at every Branch. `S04` → `S28` through «Para contactar».
- `S23→S24` (Ver la app como…, Administración only); choosing a person opens that Role's root (`S02`, `S04`, or `S15`) under the impersonation banner, and «Salir» returns to `S11`.
- `S15` cards are selectable, not navigable: tapping highlights a card (border → `#B78380`) so the nutritionist keeps their place down the day, and shows «Cancelar evaluación» under it, which opens a confirmation sheet; confirming removes the card and shows «Evaluación cancelada». There is no assessment detail screen anywhere — an Evaluation records the appointment, not its content (same reason `AW25` rows are not links).
- `S20` is reached from `S23`'s «Notificaciones» row (which shows the unread count) and from a push notification, and is filtered by role. Every role root (`S02`, `S04`, `S11`, `S15`) carries a 46px circular initials avatar (never a photo) as the **last control on the right** of its header, labelled "Tu cuenta", and it is the only path to `S23` — and therefore to change password and log out. Where the root also has a screen action (`S11` → `S13`, `S15` → `S16`), that action is a 46px rounded square with a 1px `#D8C9BB` border and sits **before** the avatar (10px gap): outlined square = screen action, filled circle with initials = your account. With unread notifications the avatar carries the unread dot on its top-right edge (drawn on the first frame of each root); its label stays «Tu cuenta» and screen readers hear «Tu cuenta, notificaciones sin leer».

**Back office (AW19–AW29)**
- `AW19`: `+ Nueva sucursal` and any row open `AW20`. There is no delete — a branch with session history can only be edited. Footer strip states this.
- `AW20`: two fields (Nombre, Dirección). Create-mode helper: "Aparecerá en el selector de sucursal al guardarla". Edit mode shows a fixed note that the branch is already referenced in the top-bar selector and in every back-office record (sessions, payments, supplies, expenses, payroll) — renaming moves nothing.
- `AW21`: accounts are created in the staff app (`S05`) or by self-registration, so this screen creates nothing — no primary action, search-only filter, pagination ("Mostrando 9 de 148 clientas" + Anterior / Página 1 de 17 / Siguiente). Any row opens `AW22`.
- `AW21` no-results: search is the whole interface, so the miss is drawn. The table card and its header row stay, with the message centred in the body — "No se encontró ninguna clienta." + "Revisa cómo escribiste el nombre o el teléfono." + a quieter "Las cuentas se crean desde la app del personal o cuando la clienta se registra." **No call to action** (unlike `S04`, this screen cannot create a client). Footer reads "Mostrando 0 de 148 clientas" and both pagination controls render in the disabled tone. At 420px the stacked cards are replaced by the same message with the search field pinned above.
- `AW22`: read-only summary panel on `#FAF7F2` rows — contacto, plan (vigencia, clases disponibles), crédito, referidos (código). With no active plan the Plan block collapses to one muted line ("Último plan vencido el 30/06/2026."). No footer, no editable fields.
- `AW23`: `+ Nuevo miembro` and any row open `AW24`. Role renders as a neutral label, not a status pill; branch assignment listed as plain text ("Equipetrol, Urubó" / "Todas"). One-at-a-time role filter, default "Todos".
- `AW24`: exactly one role, chosen in a 2×2 grid (selected = Palo de rosa, others neutral). Choosing **Administrador** replaces the branch picker with a read-only row ("Todas las sucursales (implícito por el rol)"). Email is required and phone is a separate optional contact field. Create mode sends an activation link (7 days) — same pattern as `S05`; nobody sees a password. A pending member's edit state shows «Pendiente de activación», «Cambiar correo», «Reenviar enlace», the 30-day removal note, and a quiet «Cancelar invitación» with confirmation; a suppressed resend shows the server-provided wait, and the Administrator's own email limit shows «Enviaste muchos correos en poco tiempo…» with «Podrás enviarlo en m:ss.» on the pending panel or «Podrás intentarlo en m:ss.» and a disabled «Guardar» on the new member form, and an email that belongs to a Client is refused without changes. An activated member's edit mode shows «Nombre», «Correo», and «Teléfono» as read-only rows and changes only the Role and the Branches; there is no «Restablecer contraseña», because every Account recovers its own password by email (`AW30`/`S18`). Removing a branch warns that already-assigned sessions are not reassigned.
- `AW25`: read-only. Filters are a date range and a nutritionist dropdown ("Nutricionista: todas"). No status column — an assessment records no attendance. Empty state: "Sin evaluaciones en este rango" + "Prueba con otra semana o quita el filtro de nutricionista."
- `AW26`: read-only, no manual creation — a referral exists only when someone registers with another client's code. Status pill: **Crédito otorgado** (Éxito) / **Pendiente** (Advertencia); credit is granted when the referred client's first payment is confirmed.
- `AW27`: read-only, no manual adjustment. Columns Cliente / Saldo de crédito / Última actividad, amounts right-aligned and tabular, last-activity sub-line says "Crédito ganado" or "Usado en un pago". A summary row carries **Total en saldo activo**.
- `AW28`: coexists with the mobile flow (`S11`/`S12`) — both surfaces can confirm or reject. Filters: search by client + status dropdown (Todos · Pendiente · Confirmado · Rechazado), defaulting to **Pendiente**. No primary action — clients raise payments from the app. A **Pendiente** row opens `AW29`; **Confirmado** and **Rechazado** rows are final and not clickable.
- `AW29`: 408px panel over the dimmed list. Header = client name · plan. Summary grid: Monto a verificar / Fecha / Método (always **Transferencia** — cash is confirmed on the spot by front desk in `S10`, so it never reaches this queue; the field is shown but not editable). Then a large clickable receipt image with "Ver en grande". Footer: **Confirmar pago** (primary) and **Rechazar** (Error, outlined). Pressing **Rechazar** does not reject: it swaps both buttons for a `Motivo del rechazo` textarea (helper: "La clienta verá este mensaje para corregir y volver a enviar.") plus **Confirmar rechazo** and a **Cancelar** link. The reason is mandatory — with the field empty, Confirmar rechazo is disabled. Either action closes the panel and returns to `AW28` with the row resolved.

**Forms**
- One primary "Guardar" per panel, pinned in the footer.
- Panels state their implicit scope in the subtitle ("Se guarda en Sucursal Equipetrol", "Queda en la nómina general, sin sucursal").
- `AW09`: `Cantidad en stock` is writable only on create. On edit it is read-only with a padlock and points to withdrawals and restocks. The edit frame ends with «Archivar insumo» (Error text), which asks «¿Archivar este insumo?» (Cancelar / Archivar); an archived Supply leaves `AW08` and `AW10`, and its withdrawals stay in `AW31`.
- `AW10`: the selected supply shows its current stock; each option in the open list shows its stock, low ones with the warning dot; helper text gives the maximum and previews the resulting stock ("Máximo: 48 unid. · Quedarán 42 unidades"); more than the stock puts the field in Error with «Solo hay N unid. en stock.» and disables «Registrar»; the primary button is also disabled until a supply is chosen.
- `AW14`: `+ Nueva categoría` expands an inline field + "Agregar" inside the panel — no modal, nothing typed is lost. The new category is saved to the `AW15` list and selected.
- `AW15`: delete is enabled only when no expense references the category; otherwise the icon renders in the disabled tone with `cursor:not-allowed` and the row states the usage count.
- `AW18`: image first (dashed drop target stating JPG/PNG, min 1200×675). With an image attached: preview, filename + dimensions, "Cambiar imagen" and "Quitar" (Error). Date range = display window only; edit mode reports whether today falls inside it.

**Drag to reorder (`AW17`)**
- Six-dot handle pinned to the left edge, `cursor:grab` → `cursor:grabbing`, hover background `#F5EEE7`.
- Cards are separate (10px gaps) rather than table rows, so dragging reads as possible at a glance.
- Each card carries its carousel position in a 26px circular badge; positions renumber on drop.
- While dragging: the lifted card gets the heavy shadow and a `-0.6deg` tilt, other cards drop to `opacity:0.55`, and a 2px `#B78380` insertion line with a "Soltar en posición N" label marks the drop target.
- Order persists on drop; the client app picks it up on next open.

**Report (`AW16`)**
- Read-only screen. Tiles: Ingresos (Éxito), Gastos (Error), Neto (Plomo cálido — a summary, not a status), each with a 3px top rule in its color, a Lora 32 figure, and a one-line explanation.
- Bar chart: paired flat bars per month (income `#7C9473`, expenses `#B25D4B`), 3 reference gridlines, linear scale of **3.333px per Bs 1.000** with the axis labels («Bs 0» … «Bs 60.000») placed on that same scale; every month of the range has its pair, and hovering or focusing a month tints its column and shows a popover with the month and both amounts. No gradients, no per-bar value labels.
- Breakdown table: rows by expense category; with «Todas las sucursales» a `Nómina` row, annotated as coming from Nómina rather than the categories, so the total reconciles. With one Branch there is no `Nómina` row, Gastos are that Branch's Expenses, Ingresos its cash payments, and a line above the tiles says «La nómina y los ingresos por transferencia se ven solo en «Todas las sucursales».»

**Responsive**
- Every admin screen is drawn at 1440px and at 420px. At 420px: sidebar collapses to a hamburger, tables become stacked cards, actions go full-width, side panels become full-screen sheets, paired date/number fields stack.

## State

- Auth: session/token, role (client, trainer, front desk, administration, nutritionist, admin).
- Selected branch (global for admin, except Nómina and the report's own selector).
- Report filters: date range + branch (including "all").
- Per-list: search query, category/month filters, pagination ("Mostrando 8 de 24").
- Panel state: open/closed, create vs. edit, the record being edited, dirty fields, validation.
- `AW17`: ordered promotion list + drag state (dragged id, hovered index).
- `AW23`/`AW24`: role (one of trainer, front desk, administration, nutritionist) + assigned branch ids; administration implies all branches. Account state (pending activation with link expiry, or active); no temporary password.
- `AW25`: date range + nutritionist filter.
- `AW28`/`AW29`: payment status (`pendiente` | `confirmado` | `rechazado`), search query, status filter (default `pendiente`), open payment id, receipt URL, rejection-reason text + its non-empty validation. Confirming a payment activates the subscription and consumes any credit; rejecting stores the reason and notifies the client to resend.
- Derived/server data: low-stock flag (`quantity <= threshold`), category usage counts (gates deletion), monthly totals, income/expense aggregates.

## Assets

- **Fonts**: Lora and Work Sans from Google Fonts.
- **Icons**: inline SVG, 24×24 viewBox, `stroke="currentColor"`-style strokes at 1.4–2.1 weight, rendered at 11–22px. Substitute your icon library, matching stroke weight and size.
- **Images**: one shipped, `emma-logo.png` (the studio's logo, transparent, used by the loading state); the rest are placeholders. Promotion thumbnails and the upload preview are `#EFE0DC` placeholder blocks with a photo glyph — real imagery comes from the studio (promotion images should be horizontal, min 1200×675).
- **Avatars**: initials on `#EFE0DC`/`#D8BDB8`. The header account avatar («Tu cuenta») is never a photo; only the Client's own profile (`18` summary card, `22`) shows her photo, centre-cropped into the circle, with the initials as fallback (follow-up 67 amends checklist 30 §9). The unread dot on the staff header avatar is a state mark, not a border (follow-up 73 amends §9).

## Files

All design files are in this folder, plus `support.js` (the runtime they load) and `ios-frame.jsx` / `android-frame.jsx` (the mobile device bezels used for documentation only).

Start with `Sistema de Diseño.dc.html` for tokens and components, then `AW02 Horario (Web Admin).dc.html` for the admin shell, then whichever feature you are implementing.
