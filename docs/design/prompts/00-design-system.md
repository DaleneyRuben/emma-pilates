# Prompt 00 — Design System

Foundational prompt. Every screen prompt after this one references it by name so results stay visually consistent across all five surfaces.

---

Design a foundational design system for **Emma Pilates Studio**, a warm, sophisticated, luminous boutique studio brand ("Movimiento · Equilibrio · Bienestar" — Movement · Balance · Wellbeing). This will anchor five app surfaces: a client mobile app, a trainer mobile app, a front-desk assistant tablet app, an admin mobile app, and an admin desktop web app — so establish reusable visual language, not one screen.

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

**Style:**
- Soft-rounded corners — ~12–16px on cards, ~8px on buttons/inputs. Restrained, not maximal.
- Thin, single-weight line icons only — no filled glyphs.
- Spacious layout — generous whitespace, airy rather than dense.
- Buttons: solid Palo de rosa fill, rounded rectangle, generous mobile-first tap targets.
- Cards: Marfil/white surface, thin Arena cálida border, soft shadow.
- Bottom tab bar navigation pattern for mobile surfaces.

Produce: a color palette reference, a type scale (headings/body/labels), button states (default/pressed/disabled), a status pill/badge component using the semantic colors, a card component, and a bottom tab bar — as one cohesive style sheet, not individual app screens.
