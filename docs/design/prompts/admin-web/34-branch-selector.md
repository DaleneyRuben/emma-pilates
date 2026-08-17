# Prompt AW34 — Selector de sucursal

Admin desktop web. Not a page of its own — the overlay states of the **branch selector** that the shell (Prompt AW02) already draws in the top bar as a pin icon, "Sucursal Equipetrol" and a chevron, but that no screen has ever opened. The exact counterpart of the user menu (Prompt AW33), on the other cell of the same top bar. Reachable from every authenticated page.

This is the last unopened control in the admin shell. `AW19` describes itself as "la lista que alimenta el selector de sucursal de la barra superior" and lists four branches — Equipetrol, Urubó, Norte, Las Palmas — while `booking/CONTEXT.md` scopes Sessions, Availability Blocks and staff assignments to a Branch, and `back-office/CONTEXT.md` scopes Supplies, Withdrawals and Expenses to one too. Multi-branch is designed into every screen except the act of switching.

---

Using the Emma Pilates Studio design system (Prompt 00) and the shell established by Horario (Prompt AW02), design the **selector de sucursal** of the admin desktop web app.

**Language:** all visible copy is neutral Spanish (Bolivia), informal "tú" address.

**Context:** draw the states over existing pages, sidebar and top bar intact, so the overlay reads in place. Nothing behind the overlay changes.

Show four frames:

**1. Escritorio · Selector abierto (página con sucursal).** Drawn over Horario (Prompt AW02). Clicking the top-bar branch cell opens a popover anchored to its left edge — white, 1px `#E4D8CC`, radius 10, popover shadow `0 12px 28px rgba(74,58,48,0.14)`, roughly 280px wide. The chevron rotates while open; a click outside or Esc closes it.
- A 10px uppercase `0.18em` `#A79E9A` group label, "Sucursal", then the four branches from `AW19` as 40px rows, 13.5px, hover `#FAF3EC`.
- Each row: the branch name on the first line, its address in 11.5px `#A79E9A` truncated to one line beneath — the names alone ("Norte", "Las Palmas") don't tell an administrator which place they mean.
- The active branch, Equipetrol, is marked the way the sidebar marks an active item: `#EFE0DC` background, `#8A5D59` text, weight 500, plus a check glyph on the right. Never a status pill — a branch is not a state.
- **No "Todas las sucursales" option.** Only the report (`AW16`) aggregates across branches, and it carries its own selector for exactly that reason. The shell selector always resolves to one branch.
- A divider, then one quiet 36px row in `#B78380`: "Gestionar sucursales", opening `AW19`. It is a link, not a button — this popover creates nothing.
- Choosing a branch closes the popover and reloads the page the administrator is already on, scoped to the new branch. It never navigates them somewhere else, and it never asks them to confirm: the switch is free and instantly reversible.

**2. Escritorio · Selector sobre una página sin sucursal.** Drawn over Pagos (Prompt AW28). Several back-office pages are studio-wide, not branch-scoped — `AW11` Nómina, `AW21`/`AW22` Clientes, `AW26` Referidos, `AW27` Créditos, `AW28`/`AW29` Pagos — and the selector stays in the top bar on all of them for shell consistency. Opened there, it must say so instead of implying a filter that isn't running.
- Above the branch list, a note on a `#FAF7F2` row with 1px `#EFE6DC`: "Esta página no se filtra por sucursal — los pagos son del estudio, no de una sede." Swap the last clause for the record type of whichever page it's opened over.
- The list still renders, still marks the active branch, and still switches — the choice persists for the next page that does use it. The rows are not disabled: the selection is real, just not applied here.

**3. Escritorio · Cambio aplicado.** The same Horario page after choosing **Urubó**: the top-bar cell now reads "Sucursal Urubó", the page subtitle updates to that branch's own figure, and the week grid holds Urubó's sessions. Show it beside frame 1 so the scope change is legible as cause and effect. No confirmation, no notice strip — the top bar is the persistent answer to "which branch am I in", and repeating it in a transient message would be noise.

**4. Navegador angosto · 420 px.** At 420px the sidebar collapses to a hamburger and the top bar has room for the branch name only, without the address. The popover becomes a full-width sheet anchored to the bottom, per the responsive rules in the design system, with the same rows at 48px and the same active marking.

Note in the frames that this selector belongs to the shell and is present unchanged on every authenticated admin page, and that `AW16` Reporte is the one screen that overrides it with a selector of its own — the one place "Todas las sucursales" exists.
