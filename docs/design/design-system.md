# Design System

## Brand

**Emma Pilates Studio** — "Movimiento · Equilibrio · Bienestar"

> Una identidad cálida, sofisticada y luminosa, con una conexión natural con el bienestar.

## Language

This project is for Bolivia. Scope is **user-visible text only** — every screen prompt, every generated label, button, tag, and message — in **neutral Spanish**, never English. No regional slang, no Spain-specific vocabulary. The codebase itself (domain terms, `CONTEXT.md`, ADRs, code) stays English, per the existing glossary convention.

Assumed default: informal **"tú"** address (not "usted") — standard for consumer wellness apps in the region. Flag if the studio prefers the formal register.

Currency is the boliviano, written `Bs 1.534,90` (dot thousands, comma decimals), with no decimals when they are ,00 (`Bs 450`). Dates in lists read `jue 19 nov`, in titles `Jueves 19 de noviembre`, with a time `jue 19 nov · 08:00`; never `dd/mm/aaaa` or ISO on screen (CSV exports and date inputs keep theirs). Times are 24-hour. Capacity reads `4 de 8 lugares` (FIX-090; the shared formatters live in `@pilates/api-contracts`).

Words (owner, 2026-11-19): **Clientas** (never Clientes or Alumnas), **Clase** (never Sesión; «sesión» is only logging in and out), **Instructora** (the trainer Role), **Asistente** (the front-desk Role). Clientas and the team read in the feminine: Activa, Clienta desde, Aprobada, Clienta referida; an ended plan is «Plan vencido».

## Color Palette

**Palette B (owner, 2026-11-19; [follow-up 280](./prompts/followups/280-base-comun-palette-b.md)).** Fixed across every surface: the client app, the staff app, the admin web and the public site. **Only these five colours — nothing else on any screen**: no greys, no olive, no white, and no status colours.

| Name | Hex | Role |
|---|---|---|
| Crema | `#F9F4F2` | Page background, cards, inputs, text on Rosa profundo and on Palo de rosa |
| Rubor | `#E7CCBF` | Soft backgrounds: the exception pill, the form summary, the time box in class rows, row dividers |
| Rosa arcilla | `#CDA697` | 1px borders of cards, inputs, unselected chips and disabled buttons |
| Palo de rosa | `#B78380` | The hero block (large Crema text only) and initials circles |
| Rosa profundo | `#93615D` | All text and icons, the primary button, the selected chip, the secondary button's border, an invalid field's border |

- Text is always Rosa profundo; hierarchy comes from size and weight. Rosa profundo on Crema (about 4.8:1) is the only pair readable at small sizes.
- State is said with words, weight, a Rubor pill or Rosa profundo — never green, amber or red.
- The scrim behind sheets is Rosa profundo at 35 % alpha.
- Token names in `packages/mobile-core/src/ui/tokens.ts`, `apps/admin-web/src/index.css` (`@theme`) and `apps/public-site/estilos.css` predate palette B; each keeps its role and takes one of the five colours.

## Typography

Fonts: **Lora** (400/500/600 — headings, proper names, prices) and **Work Sans** (300/400/500/600 — body, labels, controls). Google Fonts.

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

## Spacing, Radius, Shadow

- Spacing scale: 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 24, 26, 32, 40 px.
- Radius: 10 inputs and the class time box, 12 buttons and insets, 16 cards on every surface, 18 the hero, 999 pills and chips.
- No shadows on cards: a 1px Arcilla border instead.

## Buttons and pieces

- **Primary**: Rosa profundo fill, Crema Work Sans 600 label, radius 12, 52 high on mobile (44 on the web). **One per screen.**
- **Secondary**: Crema with a 1.5px Rosa profundo border and a Rosa profundo label.
- **Destructive**: the secondary look plus a confirmation step. Never red.
- **Disabled**: Crema with an Arcilla border and a Rosa profundo 500 label, always with a reason line under it.
- **Chip**: selected Rosa profundo with a Crema 600 label; unselected Crema with a 1px Arcilla border; 38 high with a 44 target.
- **Pill**: only for an exception («Por vencer», «Primera clase»): Rubor with bold Rosa profundo 12 px text. Normal states are words. Unread is bold weight.
- **Icons** stand alone: no tinted discs behind them.
- **Header (Encabezado A)**: the back arrow on its own row, then the screen's own Lora 500 30 title. Never the parent screen's name.
- **Class card (Clase E)**: the next class as a Palo de rosa hero; other classes as rows with the time in a Rubor box and «N de M»; cancelled classes folded at the end, «N canceladas por mínimo · Ver».
- **Forms (Form B)**: label above (14/600); examples as hint text under the field, «Ej.: …», never in the placeholder; no dots in password placeholders; on save, a Rubor box at the top «Faltan N datos para guardar» with the labels, and each field marked with a 2px Rosa profundo border and a bold message.
- **Phone-width web lists (Lista C)**: a Palo de rosa initials circle, the name, one secondary line and a chevron; filter chips on top; a Rubor pill only for the exception.
- Mobile hit targets never below 44px.

## Style Conventions

Applies to every surface unless a surface-specific prompt overrides it.

- **Corners**: soft-rounded — 16px on cards, 12px on buttons, 10px on inputs. Restrained, not maximal.
- **Icons**: thin, single-weight line icons only, inline SVG, 24×24 viewBox, `stroke="currentColor"`-style strokes at 1.4–2.1 weight, rendered at 11–22px. No filled glyphs.
- **Density**: spacious on mobile — generous whitespace between elements. Admin web runs tighter (see Typography above) — dense, scanned/operated desktop work, not a mobile-style card layout.
- **Buttons/CTAs**: solid fill in Rosa profundo, rounded rectangle, generous mobile-first tap targets.
- **Cards**: Crema with a 1px Rosa arcilla border, no shadow.
- **Navigation** (mobile surfaces): bottom tab bar for primary sections (client app only — see Staff App below).

### Client App Tab Bar

Four tabs, present on every authenticated client screen except Login/Sign Up:

| Tab | Leads to |
|---|---|
| Inicio | Home dashboard |
| Reservar | Browse Sessions → Session Detail |
| Mis Reservas | My Bookings list → Reschedule / Class History |
| Perfil | Profile, Notifications, Subscription detail, Plans & Payment, Evaluations, Referrals |

Plans & Payment, Subscription detail, Evaluations, and Referrals are not top-level tabs — they're reached from Home quick-action cards and/or from Perfil, keeping the tab bar at four items.

### Staff App

**One app, four Roles.** Trainers, Assistants, Administrators, and the Nutritionist share a single mobile app and a single login (Prompt S01) — there is no separate install per Role and no role picker, since every Staff Member has exactly one Role. After authenticating, the app routes straight to the home screen for that account's Role:

| Role | Home screen | Scope |
|---|---|---|
| Trainer | My Schedule | View own Sessions, mark Attendance. Narrow, single-purpose. |
| Assistant | Client Search | Find/create a client, book or manage Bookings and record a cash Payment on their behalf. Responsive to both phone and tablet — assistants commonly use tablets at the front desk, but the same app must also work well on a phone (mobile-first layout, adapting at tablet width — e.g. a list-only phone layout becoming a side-by-side list-and-detail layout). |
| Administrator | Pending Payments | Per [ADR-0004](../adr/0004-split-administrator-across-mobile-and-desktop.md), only two time-critical tasks: confirm/reject a pending transfer Payment, and cancel a Session as a last resort. Pending Payments is what a push notification opens directly into, with a header action leading into the Cancel Session flow as a secondary path. |
| Nutritionist | Mi Agenda | See who's booked into upcoming Evaluations, and publish/manage Availability Blocks (the open time ranges Evaluation slots are auto-generated from) as a secondary path. |

No tab bar for any Role — each is a header + back-arrow drill-down from its home screen, since none of the four needs more than a couple of levels of navigation.

### Admin Desktop Web Responsiveness

This is a website, opened in any browser — including a phone's browser — not the staff mobile app above. It must never break or become unusable at a narrow width: dense tabular views (the income/expense report, Back Office lists) reflow into a stacked/card layout on narrow screens, side panels become full-screen sheets, and the sidebar collapses to a hamburger drawer. This does not change ADR-0004's boundary — the work itself (schedule building, Back Office entry, reports) is still designed desktop-first for deliberate, detailed use; a phone browser is a fallback that stays usable, not the intended primary workflow.

### Admin Desktop Web Navigation

Reference width **1440px**; every screen also has a 420px narrow-browser variant.

A persistent left sidebar (236px, not a mobile tab bar), grouped into five sections. **This is the canonical, complete item list — every admin-web prompt and every regenerated screen must render all of it, not a subset:**

| Group | Contains |
|---|---|
| Horario | Schedule grid, Session form |
| Catálogo | Tipos de clase, Planes, Sucursales |
| Back Office | Clientes, Pagos (badge), Insumos (badge, warning tint), Evaluaciones nutricionales, Personal, Nómina, Gastos, Categorías de gasto |
| Reporte | Income/expense report |
| Promociones | Promociones, Referidos, Créditos |

There is no "Descuentos" item — see [ADR-0007](../adr/0007-drop-descuentos-from-admin-web.md); no domain concept backs it, and it must not be reintroduced.

A Branch selector sits in the top bar, persistent across every screen. It scopes most pages, but is shown-and-ignored (studio-wide data, not per-Branch) on Nómina, Clientes, Referidos, Créditos, and Pagos; Reporte replaces it with its own selector that adds "Todas las sucursales". Sucursales is the list that feeds the top-bar selector itself. On narrow/mobile widths (see Admin Desktop Web Responsiveness above), the sidebar collapses into a hamburger-triggered drawer.

List pages (Planes, Tipos de Clase, Sucursales, Clientes, Pagos, Insumos, Evaluaciones nutricionales, Personal, Nómina, Gastos, Categorías de Gasto, Promociones, Referidos, Créditos) use a dense data table with sortable columns, not mobile-style cards — this is scanned/operated desktop work. Most rows open a Form as a side panel; a "+ Nuevo" button in the page header creates one. Several lists are **read-only** (no primary action, no side panel edit) because nothing in the domain creates or edits those records directly from the admin: Clientes, Evaluaciones nutricionales, Referidos, Créditos, and Pagos (which is confirmed/rejected via a review panel, not edited). On narrow widths, tables reflow into a stacked card-per-row layout per the Admin Desktop Web Responsiveness note.
