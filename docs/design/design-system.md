# Design System

## Brand

**Emma Pilates Studio** — "Movimiento · Equilibrio · Bienestar"

> Una identidad cálida, sofisticada y luminosa, con una conexión natural con el bienestar.

## Language

This project is for Bolivia. Scope is **user-visible text only** — every screen prompt, every generated label, button, tag, and message — in **neutral Spanish**, never English. No regional slang, no Spain-specific vocabulary. The codebase itself (domain terms, `CONTEXT.md`, ADRs, code) stays English, per the existing glossary convention.

Assumed default: informal **"tú"** address (not "usted") — standard for consumer wellness apps in the region. Flag if the studio prefers the formal register.

## Color Palette

Fixed across all five surfaces (client mobile, trainer mobile, assistant tablet, admin mobile, admin desktop web).

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

### Trainer App Navigation

No tab bar. The trainer app is a narrow, single-purpose tool (view own Sessions, mark Attendance) — My Schedule is the app's home screen, with a simple header + back-arrow pattern for drilling into a Session's roster.

### Assistant App Responsiveness

The assistant app is a single responsive mobile app, not a tablet-only design — assistants commonly use tablets at the front desk, but the same app must also work well on a phone. Screen prompts should describe a mobile-first layout plus how it adapts at tablet width (e.g. a list-only phone layout becoming a side-by-side list-and-detail layout on tablet), not a fixed tablet-only composition.

### Assistant App Navigation

No tab bar. Client Search is the app's home/root screen — an Assistant's work always starts with finding (or creating) the client they're acting on behalf of.

### Admin Mobile App Navigation

No tab bar. Per [ADR-0004](../adr/0004-split-administrator-across-mobile-and-desktop.md), this app carries only two time-critical tasks. Pending Payments is the home/root screen (the one driven by push notifications), with a header action leading into the Cancel Session flow as a secondary path.

### Admin Desktop Web Responsiveness

This is a website, opened in any browser — including a phone's browser — not a native mobile app (that's the separate Admin Mobile App above). It must never break or become unusable at a narrow width: dense tabular views (the income/expense report, Back Office lists) reflow into a stacked/card layout on narrow screens. This does not change ADR-0004's boundary — the work itself (schedule building, Back Office entry, reports) is still designed desktop-first for deliberate, detailed use; a phone browser is a fallback that stays usable, not the intended primary workflow.
