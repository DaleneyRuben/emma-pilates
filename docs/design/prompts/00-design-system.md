# Prompt 00 — Design System

Foundational prompt. Every screen prompt after this one references it by name so results stay visually consistent across all three apps.

---

Design a foundational design system for **Emma Pilates Studio**, a warm, sophisticated, luminous boutique studio brand ("Movimiento · Equilibrio · Bienestar" — Movement · Balance · Wellbeing). This will anchor **three separate applications**, so establish reusable visual language — components, type scale, color usage — not one screen:

1. **Client mobile app** (iOS/Android) — the main consumer-facing app: browsing and booking classes, plans, payments, evaluations, referrals. The largest, richest surface.
2. **Staff mobile app** (iOS/Android, responsive to tablet) — one app shared by four Roles (Trainer, Assistant, Administrator, Nutritionist), routed by whichever Role the logged-in account has: a Trainer sees their own class schedule and marks attendance; an Assistant looks up or creates clients, books on their behalf, and records cash payments (used on phones and tablets interchangeably, so it must adapt cleanly across that range); an Administrator handles only the two things too urgent to wait for a desk (confirm a payment, cancel a class in an emergency); a Nutritionist sees who's booked into their upcoming appointments and publishes their own availability.
3. **Admin web app** (desktop browser, but responsive down to any mobile browser too) — the largest, most different surface: dense data tables, side-panel forms, a sidebar-navigated back office (inventory, payroll, expenses), a schedule builder, and a reporting dashboard. Desktop-first information density, but must never break in a narrow browser window.

All three need to feel like one brand at a glance, while each respects its own device conventions (tab bars or header/back-arrow drill-downs on the phone apps, a sidebar on the web app, tabular density on desktop vs. spacious cards on mobile).

**Color palette (fixed, use exactly):**
- Plomo cálido `#4A4A4A` — primary text / dark neutral
- Palo de rosa `#B78380` — primary accent (buttons, active states, key highlights)
- Rosa empolvado `#D8BDB8` — secondary accent
- Arena cálida `#D8C9BB` — warm neutral (borders, dividers)
- Marfil `#FAF7F2` — background

**Semantic status colors (separate from the brand accent — used only for state, never decoration):**
- Success `#7C9473` — confirmed / active / attended
- Warning `#C99A4E` — pending
- Error `#B25D4B` — cancelled / expired / no-show

**Typography:** a warm serif for headings, names, and prices; a clean plain sans for body text and UI labels. Comfortable reading size, clear hierarchy.

**Language:** all UI copy is neutral Spanish (this is for Bolivia), informal "tú" address, no regional slang. Any sample text in the type scale or components should be in Spanish, not English.

**Style:**
- Soft-rounded corners — ~12–16px on cards, ~8px on buttons/inputs. Restrained, not maximal.
- Thin, single-weight line icons only — no filled glyphs.
- Spacious layout — generous whitespace, airy rather than dense.
- Buttons: solid Palo de rosa fill, rounded rectangle, generous mobile-first tap targets.
- Cards: Marfil/white surface, thin Arena cálida border, soft shadow.
- Bottom tab bar navigation pattern for the client app specifically (the staff app uses header + back-arrow drill-downs instead, and the web app uses a sidebar — both covered in their own prompts, not this one).

Produce: a color palette reference, a type scale (headings/body/labels), button states (default/pressed/disabled), a status pill/badge component using the semantic colors, a card component, and a bottom tab bar — as one cohesive style sheet, not individual app screens.
