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
