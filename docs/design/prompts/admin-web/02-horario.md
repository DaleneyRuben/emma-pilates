# Prompt AW02 — Horario (Schedule)

Admin desktop web. Chains from Prompt AW01 (Login) — this is the first authenticated screen and establishes the shared shell (sidebar + top bar) every later admin-web screen reuses. Prompt AW03 (Session Form) chains from this one.

---

Using the Emma Pilates Studio design system (Prompt 00) and following on from Login (Prompt AW01), design the **Horario** page of the admin desktop web app — this establishes the app's shared shell.

**Language:** all visible copy is neutral Spanish (Bolivia), informal "tú" address.

**Responsive:** design a desktop frame and a narrow/mobile-browser frame (see design system's Admin Desktop Web Responsiveness note): on desktop the sidebar is always visible; on narrow widths it collapses behind a hamburger icon in the top bar, and the schedule grid's 7 day-columns become a single scrollable day at a time with day-tabs above it.

**Shell (establish here, reused on every later screen):**
- A persistent left sidebar with five groups: "Horario" (active), "Catálogo", "Back Office", "Reporte", "Promociones" — each a section label with its items nested below when expanded; "Horario" and "Reporte" have no sub-items and act as direct links.
- A top bar with the Emma wordmark (small), a Branch selector dropdown, and a user menu (Administrator's name + avatar) on the right.

**Page content, below the shell:**
1. Page title "Horario" with a "+ Nueva sesión" button (Palo de rosa fill) at the top right.
2. A weekly calendar grid: seven day columns (Mon–Sun), a shared vertical time axis down the left edge. Since a Branch has a single studio room, Sessions never overlap — each day column shows its Sessions as a vertical stack of blocks positioned along the time axis, each block showing Class Type name, time, and Trainer name.

Clicking "+ Nueva sesión" or an existing Session block navigates to Session Form (Prompt AW03), in create or edit mode respectively.

Clean desktop information density — this is deliberate, tabular work, not a spacious mobile layout. Soft-rounded corners and the brand palette still apply, but density can be tighter than the mobile surfaces.
