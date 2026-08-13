# Design System

## Brand

**Emma Pilates Studio** — "Movimiento · Equilibrio · Bienestar"

> Una identidad cálida, sofisticada y luminosa, con una conexión natural con el bienestar.

## Language

This project is for Bolivia. Scope is **user-visible text only** — every screen prompt, every generated label, button, tag, and message — in **neutral Spanish**, never English. No regional slang, no Spain-specific vocabulary. The codebase itself (domain terms, `CONTEXT.md`, ADRs, code) stays English, per the existing glossary convention.

Assumed default: informal **"tú"** address (not "usted") — standard for consumer wellness apps in the region. Flag if the studio prefers the formal register.

## Color Palette

Fixed across all three apps: the client mobile app, the staff mobile app (Trainer/Assistant/Administrator, routed by Role), and the admin desktop web app.

| Name | Hex | Role |
|---|---|---|
| Plomo cálido | `#4A4A4A` | Primary text / dark neutral |
| Palo de rosa | `#B78380` | Primary accent |
| Rosa empolvado | `#D8BDB8` | Secondary accent |
| Arena cálida | `#D8C9BB` | Tertiary / warm neutral |
| Marfil | `#FAF7F2` | Background / light neutral |

Every screen-generation prompt should reference this palette by name and hex so results stay consistent across surfaces.

## Semantic Colors

Status indicators (Booking confirmed/cancelled, Payment pending/confirmed, Subscription active/expired) use dedicated semantic hues, kept separate from the brand accent above so status reads at a glance without borrowing Palo de rosa's meaning.

| Name | Hex | Role |
|---|---|---|
| Success | `#7C9473` | Confirmed / active / attended |
| Warning | `#C99A4E` | Pending |
| Error | `#B25D4B` | Cancelled / expired / no-show |

## Style Conventions

Applies to every surface unless a surface-specific prompt overrides it.

- **Corners**: soft-rounded — ~12–16px on cards, ~8px on buttons and inputs. Restrained, not maximal.
- **Icons**: thin, single-weight line icons only. No filled glyphs.
- **Density**: spacious — generous whitespace between elements, not a dense enterprise layout.
- **Typography**: a warm serif for headings, class names, and prices; a clean plain sans for body text and UI labels.
- **Buttons/CTAs**: solid fill in Palo de rosa, rounded rectangle, generous mobile-first tap targets.
- **Cards**: Marfil/white surface, thin Arena cálida border, soft shadow.
- **Navigation** (mobile surfaces): bottom tab bar for primary sections.

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
| Assistant | Client Search | Find/create a client, book or record a cash Payment on their behalf. Responsive to both phone and tablet — assistants commonly use tablets at the front desk, but the same app must also work well on a phone (mobile-first layout, adapting at tablet width — e.g. a list-only phone layout becoming a side-by-side list-and-detail layout). |
| Administrator | Pending Payments | Per [ADR-0004](../adr/0004-split-administrator-across-mobile-and-desktop.md), only two time-critical tasks: confirm/reject a pending transfer Payment, and cancel a Session as a last resort. Pending Payments is what a push notification opens directly into, with a header action leading into the Cancel Session flow as a secondary path. |
| Nutritionist | Mi Agenda | See who's booked into upcoming Evaluations, and publish/manage Availability Blocks (the open time ranges Evaluation slots are auto-generated from) as a secondary path. |

No tab bar for any Role — each is a header + back-arrow drill-down from its home screen, since none of the four needs more than a couple of levels of navigation.

### Admin Desktop Web Responsiveness

This is a website, opened in any browser — including a phone's browser — not the staff mobile app above. It must never break or become unusable at a narrow width: dense tabular views (the income/expense report, Back Office lists) reflow into a stacked/card layout on narrow screens. This does not change ADR-0004's boundary — the work itself (schedule building, Back Office entry, reports) is still designed desktop-first for deliberate, detailed use; a phone browser is a fallback that stays usable, not the intended primary workflow.

### Admin Desktop Web Navigation

A persistent left sidebar (not a mobile tab bar), grouped into five sections:

| Group | Contains |
|---|---|
| Horario | Schedule grid, Session form |
| Catálogo | Planes, Tipos de Clase |
| Back Office | Insumos, Nómina, Gastos, Categorías de Gasto |
| Reporte | Income/expense report |
| Promociones | Promotions carousel management |

A Branch selector sits in the top bar, persistent across every screen except Reporte (which offers its own "todas las sucursales" option since it aggregates), since most Back Office and schedule data is scoped to a single Branch. On narrow/mobile widths (see Admin Desktop Web Responsiveness above), the sidebar collapses into a hamburger-triggered drawer.

List pages (Planes, Tipos de Clase, Insumos, Nómina, Gastos, Categorías de Gasto, Promociones) use a dense data table with sortable columns, not mobile-style cards — this is scanned/operated desktop work. Each row opens its Form as a side panel; a "+ Nuevo" button in the page header creates one. On narrow widths, tables reflow into a stacked card-per-row layout per the Admin Desktop Web Responsiveness note.
