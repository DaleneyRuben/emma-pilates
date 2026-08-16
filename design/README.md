# Handoff: Emma Pilates Studio — client app, staff app, admin web

## Overview

Three surfaces for a Pilates studio in Santa Cruz de la Sierra, Bolivia:

| Surface | Files | Form factor | Users |
|---|---|---|---|
| **Client app** | `01`–`19` | Mobile (iOS/Android, 390×844 reference) | Clients: booking, plans, payments, nutrition, referrals |
| **Staff app** | `S01`–`S17` | Mobile | Trainers, front desk, administration, nutritionist |
| **Admin web** | `AW01`–`AW31` | Desktop web (1440px reference, 420px narrow) | Studio management: schedule, catalog, back office, reports, promotions |
| **Design system** | `Sistema de Diseño.dc.html` | — | Source of truth for tokens and components |

All product copy is **neutral Spanish (Bolivia), informal "tú" address**. Currency is the boliviano, written `Bs 1.200,00` (dot thousands, comma decimals). Dates are `dd/mm/aaaa`, times are 24-hour.

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
| Palo de rosa (primario) | `#B78380` | Primary buttons, active nav, links, focus ring |
| Palo de rosa hover | `#A87370` | Primary hover |
| Palo de rosa presionado | `#9C6764` | Primary active |
| Palo de rosa tinte | `#EFE0DC` | Active nav background, avatars, badges |
| Palo de rosa profundo | `#8A5D59` | Text/icon on the tint |
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
- Radius: 8px controls, 10–12px cards and panels, 14–16px outer frames, 999px pills.
- Shadows: primary button `0 2px 6px rgba(183,131,128,0.22)`; card hover `0 6px 16px rgba(74,58,48,0.10)`; side panel `-14px 0 34px rgba(74,58,48,0.14)`; dragged card `0 16px 32px rgba(74,58,48,0.20)`; popover `0 12px 28px rgba(74,58,48,0.14)`.
- Focus ring on inputs: `border-color:#B78380; box-shadow:0 0 0 3px rgba(183,131,128,0.15)`.
- Scrim behind side panels/modals: `rgba(74,58,48,0.22)`.

### Buttons

- Primary: `#B78380` fill, white text, radius 8, min-height 52 mobile / 38–46 desktop, weight 500, shadow above; hover `#A87370`, active `#9C6764`, disabled `#E7DCD8`/`#B3A9A5`.
- Secondary: 1px `#B78380` border, transparent fill, `#B78380` text; hover tint `#F6EDEB`.
- Tertiary/link: text only in `#B78380`; hover `#9C6764`.
- Compact neutral: 1px `#D8C9BB`, `#FAF7F2` fill, `#4A4A4A` text, height 30–38; hover border `#B78380`.
- Destructive: Error `#B25D4B` text/border, hover text `#94493A`, hover tint `rgba(178,93,75,0.10)`.
- **One solid button per view.**
- Mobile hit targets never below 44px.

---

## Admin web — shell (shared by AW02–AW29, AW31)

Reference width **1440px**; a 420px narrow-browser variant is drawn for every screen.

- **Top bar**, 44px, white, bottom border `#E4D8CC`: brand wordmark "Emma" (Lora 21) in a 236px cell with a right border, then on the right a **branch selector** (`Sucursal Equipetrol`, pin icon, chevron) and a **user menu** (26px `#D8BDB8` avatar with initials, name, chevron).
  - The branch selector scopes most pages. Exceptions: **AW11 Nómina**, **AW21/AW22 Clientes**, **AW26 Referidos**, **AW27 Créditos** and **AW28/AW29 Pagos** are not branch-scoped (the selector stays visible for shell consistency but is ignored — those records belong to the studio, not a branch); **AW16 Reporte** replaces the top-bar selector with its own selector that adds "Todas las sucursales".
  - **AW19 Sucursales** is the list that feeds the top-bar selector.
- **Sidebar**, 236px, white, right border `#E4D8CC`, padding 18px/12px, 4px gaps. Top-level items are 36px rows with a 15px icon; group labels are 10px uppercase `0.18em` `#A79E9A`; group children are 32px rows indented to 22px left padding. Sections auto-expand; the active group label turns `#B78380`.
  - Order: **Horario** · *Catálogo* (Tipos de clase, Planes, Sucursales) · *Back Office* (Clientes, Pagos ⟨badge 6⟩, Insumos ⟨badge 3, warning tint⟩, Evaluaciones nutricionales, Personal, Nómina, Gastos, Categorías de gasto) · **Reporte** · *Promociones* (Promociones, Referidos, Créditos). Descuentos was dropped for good — see [ADR-0007](../docs/adr/0007-drop-descuentos-from-admin-web.md); do not reintroduce it here without a new ADR superseding that one.
  - Active item: `#EFE0DC` background, `#8A5D59` text, weight 500. Hover: `#FAF3EC` background, `#B78380` text.
  - Counter badges: 18px tall pill, `#EFE0DC`/`#8A5D59`, or warning `rgba(201,154,78,0.18)`/`#9A7434`.
- **Main area**: `#FAF7F2`, padding 24px 26px 32px, 18px column gap. Header row = page title (Lora 27) + one-line subtitle (12.5 `#8A807C`) on the left, primary action(s) on the right.
- **Filter row** (where present): 34px search field (max 300px, magnifier icon, placeholder-style text) plus 34px dropdown/filter chips.

### Table convention

White card, 1px `#E4D8CC`, radius 12, `overflow:hidden`.
- Header row: `#FDFAF6`, bottom border `#E4D8CC`, padding 11px 20px, 10.5px uppercase `0.14em` `#A79E9A`.
- Body rows: padding 15px 20px, bottom divider `#F2EBE2` (last row none), row hover `#FDF7F2`. Whole row is the link into the edit panel.
- Columns are CSS grid with `minmax(0,Nfr)` tracks and 16px gap. Money and dates are right-aligned and tabular.
- Primary cell is 14px weight 500; an optional 11.5px `#A79E9A` sub-line carries context (threshold, role, description).
- Footer strip under the card: 12px `#A79E9A`, count on the left, a clarifying rule on the right.

### Side-panel form convention

Panels are **408px** wide, absolutely positioned over the dimmed (`rgba(74,58,48,0.22)`) list, `border-left:1px solid #E4D8CC`, shadow `-14px 0 34px rgba(74,58,48,0.14)`. On narrow widths the panel becomes a **full-screen sheet**.

- Header: 18px 22px, bottom border `#EFE6DC`; Lora 22 title + 11.5px context line; 30px square close button (1px `#E4D8CC`, `#FAF7F2`, hover border `#B78380`).
- Body: padding 20px 22px, 18px gaps. Field = 10.5px uppercase label + 44px control (48px on mobile) + optional 11.5px `#A79E9A` helper.
- Inputs: 1px `#D8C9BB`, radius 8, white, 14px text; focus ring as above. Unit suffixes ("min", "pers.", "unid.") and currency prefixes ("Bs") are fixed segments inside the control with a `#EFE6DC` divider and `#FDFAF6` fill.
- Two short numeric fields share a row via `grid-template-columns:minmax(0,1fr) minmax(0,1fr)` (prevents overflow).
- Read-only values render as a `#FAF7F2` row with 1px `#EFE6DC`, a padlock icon, and an explanation.
- Footer: padding 18px 22px, top border `#EFE6DC`, full-width primary button (46px).

---

## Screen inventory

### Client app (mobile)

| File | Screen | Purpose |
|---|---|---|
| `01` | Iniciar sesión | Phone + password login |
| `02` | Inicio | Promotions carousel, next class, plan status |
| `03` | Reservar | Browse sessions by day |
| `04` | Detalle de sesión | Session detail + book |
| `05` | Mis reservas | Upcoming bookings |
| `06` | Reprogramar | Move a booking |
| `07` | Historial de clases | Past classes |
| `08` | Elegir plan | Plan catalog |
| `09` | Detalle del plan | Plan detail |
| `10` | Pago | Payment (QR/transfer + receipt upload) |
| `11` | Estado del pago | Pending/confirmed/rejected states |
| `12` | Mi plan | Active plan, sessions left, expiry |
| `13` | Evaluación nutricional | Book a nutrition assessment |
| `14` | Confirmar evaluación | Confirmation step |
| `15` | Mis evaluaciones | Assessment history |
| `16` | Mis referidos | Referral code + status |
| `17` | Mi crédito | Credit balance and movements |
| `18` | Perfil | Profile and settings |
| `19` | Notificaciones | Notification list |

### Staff app (mobile)

| File | Screen | Role |
|---|---|---|
| `S01` | Iniciar sesión | All staff |
| `S02` | Mi agenda | Trainer |
| `S03` | Lista de asistentes | Trainer — attendance marking |
| `S04` | Buscar cliente | Front desk |
| `S05` | Nuevo cliente | Front desk |
| `S06` | Resumen del cliente | Front desk |
| `S07` | Reservar una clase | Front desk (on behalf of a client) |
| `S08` | Detalle de sesión | Front desk |
| `S09` | Elegir plan | Front desk |
| `S10` | Confirmar pago en efectivo | Front desk |
| `S11` | Pagos pendientes | Administration |
| `S12` | Revisar pago | Administration — approve/reject |
| `S13` | Cancelar una clase | Administration |
| `S14` | Cancelar sesión | Administration |
| `S15` | Mi agenda | Nutritionist |
| `S16` | Mi disponibilidad | Nutritionist |
| `S17` | Formulario de horario | Nutritionist |

### Admin web (desktop)

| File | Screen | Notes |
|---|---|---|
| `AW01` | Iniciar sesión | Centered card, email + password, error state |
| `AW02` | Horario | Week grid of sessions; establishes the shell |
| `AW03` | Formulario de sesión | Side panel; capacity constraints + trainer notification |
| `AW04` | Planes | Catalog table |
| `AW05` | Formulario de plan | Side panel |
| `AW06` | Tipos de clase | Catalog table |
| `AW07` | Formulario de tipo de clase | Side panel; duration/capacity row with fixed suffixes |
| `AW08` | Insumos | Branch stock table; "Stock bajo" warning pill; two actions |
| `AW09` | Formulario de insumo | Stock editable only on create; read-only + padlock on edit |
| `AW10` | Registrar retiro | Two-field fast-entry panel; stock shown per option |
| `AW11` | Nómina | Salary payments; **not** branch-scoped |
| `AW12` | Formulario de pago de sueldo | Empleado / Monto / Fecha only |
| `AW13` | Gastos | Branch expenses; month total in the subtitle |
| `AW14` | Formulario de gasto | Categoría + inline "+ Nueva categoría" / Monto / Fecha |
| `AW15` | Categorías de gasto | Plain list, inline add row, delete disabled when in use |
| `AW16` | Reporte de ingresos y gastos | Own date range + "Todas las sucursales"; 3 stat tiles, bar chart, category breakdown |
| `AW17` | Promociones | Drag-to-reorder card list (order = carousel order) |
| `AW18` | Formulario de promoción | Image upload, título, descripción, date range |
| `AW19` | Sucursales | Two-column table (Nombre / Dirección); feeds the top-bar selector; no delete |
| `AW20` | Formulario de sucursal | Side panel; nombre + dirección only; edit mode carries a fixed note about linked records |
| `AW21` | Clientes | Read-only directory, 4 columns, search only, paginated; **no primary action** |
| `AW22` | Detalle de cliente | Read-only side panel: contacto, plan, crédito, referidos; **no footer / no Guardar** |
| `AW23` | Personal | Team accounts, 4 columns, role filter; row → `AW24` |
| `AW24` | Formulario de personal | One role (2×2 grid), assigned branches, temporary password on create |
| `AW25` | Evaluaciones nutricionales | Read-only list, date range + nutritionist filter, no status column; empty state |
| `AW26` | Referidos | Read-only, 4 columns, Crédito otorgado / Pendiente pill |
| `AW27` | Créditos | Read-only, 3 columns, right-aligned tabular amounts, total row |
| `AW28` | Pagos | Studio-wide transfers; search + status filter (default Pendiente); pending row → `AW29` |
| `AW29` | Revisar pago | Review panel: summary, large receipt, Confirmar pago / Rechazar (+ mandatory reason) |
| `AW30` | Recuperar contraseña | Chains from `AW01`; centered card, no shell; form + sent states |
| `AW31` | Retiros e insumos consumidos | Read-only sub-view of `AW08`; no sidebar item of its own |

---

## Interactions & behavior

**Navigation**
- Admin: sidebar item → page. `+ Nuevo …` and any table row → the matching side panel (`AW04→AW05`, `AW06→AW07`, `AW08→AW09`, `AW11→AW12`, `AW13→AW14`, `AW17→AW18`, `AW19→AW20`, `AW21→AW22`, `AW23→AW24`, `AW28→AW29`). Close icon or scrim dismisses the panel.
- `AW01→AW30`: "¿Olvidaste tu contraseña?" on Login opens Recuperar contraseña; "Volver a iniciar sesión" returns.
- `AW08→AW31`: "Ver historial de retiros" opens the read-only withdrawal history; the back link returns to `AW08`.
- Read-only pages with no primary action: `AW21`, `AW22`, `AW25`, `AW26`, `AW27`, `AW28`, `AW31`, plus `AW16`.
- `AW08` has three actions: **Ver historial de retiros** (link, opens `AW31`), **Registrar retiro** (secondary, outlined — it subtracts stock) and **+ Nuevo insumo** (primary).

**Back office (AW19–AW29, AW31)**
- `AW19`: `+ Nueva sucursal` and any row open `AW20`. There is no delete — a branch with session history can only be edited. Footer strip states this.
- `AW20`: two fields (Nombre, Dirección). Create-mode helper: "Aparecerá en el selector de sucursal al guardarla". Edit mode shows a fixed note that the branch is already referenced in the top-bar selector and in every back-office record (sessions, payments, supplies, expenses, payroll) — renaming moves nothing.
- `AW21`: accounts are created in the staff app (`S05`) or by self-registration, so this screen creates nothing — no primary action, search-only filter, pagination ("Mostrando 9 de 148 clientes" + Anterior / Página 1 de 17 / Siguiente). Any row opens `AW22`.
- `AW22`: read-only summary panel on `#FAF7F2` rows — contacto, plan (vigencia, clases disponibles), crédito, referidos (código). With no active plan the Plan block collapses to one muted line ("Último plan vencido el 30/06/2026."). No footer, no editable fields.
- `AW23`: `+ Nuevo miembro` and any row open `AW24`. Role renders as a neutral label, not a status pill; branch assignment listed as plain text ("Equipetrol, Urubó" / "Todas"). One-at-a-time role filter, default "Todos".
- `AW24`: exactly one role, chosen in a 2×2 grid (selected = Palo de rosa, others neutral). Choosing **Administrador** replaces the branch picker with a read-only row ("Todas las sucursales (implícito por el rol)"). Create mode shows a generated temporary password (`emma-9T57`) with **Copiar** and the note that the person changes it at first login — same pattern as `S05`. Edit mode drops the temporary password and offers **Restablecer contraseña**; removing a branch warns that already-assigned sessions are not reassigned.
- `AW25`: read-only. Filters are a date range and a nutritionist dropdown ("Nutricionista: todas"). No status column — an assessment records no attendance. Empty state: "Sin evaluaciones en este rango" + "Prueba con otra semana o quita el filtro de nutricionista."
- `AW26`: read-only, no manual creation — a referral exists only when someone registers with another client's code. Status pill: **Crédito otorgado** (Éxito) / **Pendiente** (Advertencia); credit is granted when the referred client's first payment is confirmed.
- `AW27`: read-only, no manual adjustment. Columns Cliente / Saldo de crédito / Última actividad, amounts right-aligned and tabular, last-activity sub-line says "Crédito ganado" or "Usado en un pago". A summary row carries **Total en saldo activo**.
- `AW28`: coexists with the mobile flow (`S11`/`S12`) — both surfaces can confirm or reject. Filters: search by client + status dropdown (Todos · Pendiente · Confirmado · Rechazado), defaulting to **Pendiente**. No primary action — clients raise payments from the app. A **Pendiente** row opens `AW29`; **Confirmado** and **Rechazado** rows are final and not clickable.
- `AW29`: 408px panel over the dimmed list. Header = client name · plan. Summary grid: Monto a verificar / Fecha / Método (always **Transferencia** — cash is confirmed on the spot by front desk in `S10`, so it never reaches this queue; the field is shown but not editable). Then a large clickable receipt image with "Ver en grande". Footer: **Confirmar pago** (primary) and **Rechazar** (Error, outlined). Pressing **Rechazar** does not reject: it swaps both buttons for a `Motivo del rechazo` textarea (helper: "La clienta verá este mensaje para corregir y volver a enviar.") plus **Confirmar rechazo** and a **Cancelar** link. The reason is mandatory — with the field empty, Confirmar rechazo is disabled. Either action closes the panel and returns to `AW28` with the row resolved.
- `AW31`: read-only, month-scoped list of withdrawals against the branch selected in the top bar. Reached only from `AW08`'s "Ver historial de retiros"; withdrawals themselves are still recorded exclusively in `AW10`. "Insumos" stays the active sidebar item — there is no nav entry of its own.

**Forms**
- One primary "Guardar" per panel, pinned in the footer.
- Panels state their implicit scope in the subtitle ("Se guarda en Sucursal Equipetrol", "Queda en la nómina general, sin sucursal").
- `AW09`: `Cantidad en stock` is writable only on create. On edit it is read-only with a padlock and points to withdrawals.
- `AW10`: the selected supply shows its current stock; each option in the open list shows its stock, low ones with the warning dot; helper text previews the resulting stock ("Quedarán 42 unidades"); the primary button is disabled until a supply is chosen.
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
- Bar chart: paired flat bars per month (income `#7C9473`, expenses `#B25D4B`), 3 reference gridlines, linear scale of **3.333px per Bs 1.000** with the axis labels placed on that same scale. No gradients, no per-bar value labels.
- Breakdown table: rows by expense category; the `Sueldos` row is annotated as coming from Nómina rather than the category list, so the total reconciles.

**Responsive**
- Every admin screen is drawn at 1440px and at 420px. At 420px: sidebar collapses to a hamburger, tables become stacked cards, actions go full-width, side panels become full-screen sheets, paired date/number fields stack.

## State

- Auth: session/token, role (client, trainer, front desk, administration, nutritionist, admin).
- Selected branch (global for admin, except Nómina and the report's own selector).
- Report filters: date range + branch (including "all").
- Per-list: search query, category/month filters, pagination ("Mostrando 8 de 24").
- Panel state: open/closed, create vs. edit, the record being edited, dirty fields, validation.
- `AW17`: ordered promotion list + drag state (dragged id, hovered index).
- `AW23`/`AW24`: role (one of trainer, front desk, administration, nutritionist) + assigned branch ids; administration implies all branches. Generated temporary password + `mustChangePassword` flag.
- `AW25`: date range + nutritionist filter.
- `AW28`/`AW29`: payment status (`pendiente` | `confirmado` | `rechazado`), search query, status filter (default `pendiente`), open payment id, receipt URL, rejection-reason text + its non-empty validation. Confirming a payment activates the subscription and consumes any credit; rejecting stores the reason and notifies the client to resend.
- Derived/server data: low-stock flag (`quantity <= threshold`), category usage counts (gates deletion), monthly totals, income/expense aggregates.

## Assets

- **Fonts**: Lora and Work Sans from Google Fonts.
- **Icons**: inline SVG, 24×24 viewBox, `stroke="currentColor"`-style strokes at 1.4–2.1 weight, rendered at 11–22px. Substitute your icon library, matching stroke weight and size.
- **Images**: none shipped. Promotion thumbnails and the upload preview are `#EFE0DC` placeholder blocks with a photo glyph — real imagery comes from the studio (promotion images should be horizontal, min 1200×675).
- **Avatars**: initials on `#EFE0DC`/`#D8BDB8`, no photos.

## Files

All design files are in this folder, plus `support.js` (the runtime they load) and `ios-frame.jsx` / `android-frame.jsx` (the mobile device bezels used for documentation only).

Start with `Sistema de Diseño.dc.html` for tokens and components, then `AW02 Horario (Web Admin).dc.html` for the admin shell, then whichever feature you are implementing.
