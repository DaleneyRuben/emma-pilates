# Design System

## Brand

**Emma Pilates Studio** — "Movimiento · Equilibrio · Bienestar"

> Una identidad cálida, sofisticada y luminosa, con una conexión natural con el bienestar.

## Language

This project is for Bolivia. Scope is **user-visible text only** — every screen prompt, every generated label, button, tag, and message — in **neutral Spanish**, never English. No regional slang, no Spain-specific vocabulary. The codebase itself (domain terms, `CONTEXT.md`, ADRs, code) stays English, per the existing glossary convention.

Assumed default: informal **"tú"** address (not "usted") — standard for consumer wellness apps in the region. Flag if the studio prefers the formal register.

Currency is the boliviano, written `Bs 1.200,00` (dot thousands, comma decimals). Dates are `dd/mm/aaaa`, times are 24-hour.

## Color Palette

Fixed across all three apps: the client mobile app, the staff mobile app (Trainer/Assistant/Administrator/Nutritionist, routed by Role), and the admin desktop web app. **Closed palette — do not introduce colors outside this list.** Tints are the semantic color at low alpha.

| Token | Hex | Role |
|---|---|---|
| Arena (page background) | `#F2ECE5` | App/page background |
| Superficie | `#FAF7F2` | Content area behind cards, inset panels |
| Blanco | `#FFFFFF` | Cards, tables, panels, inputs |
| Superficie sutil | `#FDFAF6` | Table headers, field suffixes, inline add rows |
| Hover de fila | `#FDF7F2` | Table row / card hover |
| Palo de rosa (primario) | `#B78380` | Primary buttons, active nav, links, focus ring |
| Palo de rosa hover | `#A87370` | Primary hover |
| Palo de rosa presionado | `#9C6764` | Primary active |
| Palo de rosa tinte | `#EFE0DC` | Active nav background, avatars, badges |
| Palo de rosa profundo | `#8A5D59` | Text/icon on the tint |
| Rosa empolvado | `#D8BDB8` | Secondary accent, avatar fill |
| Tinte suave | `#F6EDEB` / `#F7EEE9` | Secondary-button hover |
| Plomo cálido | `#4A4A4A` | Primary text, neutral summary figures |
| Texto secundario | `#6E6663` | Body text, table secondary cells |
| Texto tenue | `#8A807C` | Subtitles, labels, helper text |
| Texto muy tenue | `#A79E9A` | Placeholders, meta, footnotes |
| Borde fuerte | `#D8C9BB` | Frame borders, input borders |
| Borde | `#E4D8CC` | Card and table borders |
| Divisor | `#F2EBE2` | Row separators inside cards |
| Éxito | `#7C9473` (texto `#5F7457`) | Confirmed, active, attended, income |
| Advertencia | `#C99A4E` (texto `#9A7434`) | Pending, low stock |
| Error | `#B25D4B` (texto `#94493A`) | Cancelled, overdue, no-show, destructive, expenses |
| Deshabilitado | fondo `#E7DCD8`, texto `#B3A9A5` | Disabled buttons and icons |

Status pills: semantic color at **12–16% alpha** as background, the darker text tone as foreground, a **6px dot** of the full color so state does not depend on color alone, fully rounded, 11.5–12px.

Every screen-generation prompt should reference this palette by name and hex so results stay consistent across surfaces.

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
- Radius: 8px controls, 10–12px cards and panels, 14–16px outer frames, 999px pills.
- Shadows: primary button `0 2px 6px rgba(183,131,128,0.22)`; card hover `0 6px 16px rgba(74,58,48,0.10)`; side panel `-14px 0 34px rgba(74,58,48,0.14)`; dragged card `0 16px 32px rgba(74,58,48,0.20)`; popover `0 12px 28px rgba(74,58,48,0.14)`.
- Focus ring on inputs: `border-color:#B78380; box-shadow:0 0 0 3px rgba(183,131,128,0.15)`.
- Scrim behind side panels/modals: `rgba(74,58,48,0.22)`.

## Buttons

- Primary: `#B78380` fill, white text, radius 8, min-height 52 mobile / 38–46 desktop, weight 500, shadow above; hover `#A87370`, active `#9C6764`, disabled `#E7DCD8`/`#B3A9A5`.
- Secondary: 1px `#B78380` border, transparent fill, `#B78380` text; hover tint `#F6EDEB`.
- Tertiary/link: text only in `#B78380`; hover `#9C6764`.
- Compact neutral (admin web): 1px `#D8C9BB`, `#FAF7F2` fill, `#4A4A4A` text, height 30–38; hover border `#B78380`.
- Destructive: Error `#B25D4B` text/border, hover text `#94493A`, hover tint `rgba(178,93,75,0.10)`.
- **One solid button per view.**
- Mobile hit targets never below 44px.

## Style Conventions

Applies to every surface unless a surface-specific prompt overrides it.

- **Corners**: soft-rounded — ~12–16px on cards, ~8px on buttons and inputs. Restrained, not maximal.
- **Icons**: thin, single-weight line icons only, inline SVG, 24×24 viewBox, `stroke="currentColor"`-style strokes at 1.4–2.1 weight, rendered at 11–22px. No filled glyphs.
- **Density**: spacious on mobile — generous whitespace between elements. Admin web runs tighter (see Typography above) — dense, scanned/operated desktop work, not a mobile-style card layout.
- **Buttons/CTAs**: solid fill in Palo de rosa, rounded rectangle, generous mobile-first tap targets.
- **Cards**: white/Superficie surface, thin Borde, soft shadow.
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
