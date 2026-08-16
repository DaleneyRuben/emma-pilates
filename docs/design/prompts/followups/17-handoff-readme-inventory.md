# Follow-up — Bring the handoff README back in sync with the built screens

Targets: **`design/README.md`** (the handoff doc the design tool exports alongside the screens). Send as a follow-up.

---

The exported handoff README has drifted back to an earlier state of the bundle. Four corrections, all of them things the screens themselves already get right:

1. **Descuentos is back in the sidebar order.** The shell section lists *Promociones* as "(Promociones, Referidos, Créditos, **Descuentos**)". Descuentos was dropped for good — see [ADR-0007](../../adr/0007-drop-descuentos-from-admin-web.md) — and no built screen shows it. Remove it from the order, and keep a line noting it was dropped deliberately so it doesn't come back on the next export: "Descuentos was dropped for good — see ADR-0007; do not reintroduce it here without a new ADR superseding that one."

2. **`AW30` and `AW31` are missing.** Both are built. Restore their rows in the admin-web screen inventory, the two navigation lines (`AW01→AW30` via "¿Olvidaste tu contraseña?"; `AW08→AW31` via "Ver historial de retiros", back link returns), `AW31` in the read-only list, and the note that `AW08` has **three** actions, not two — Ver historial de retiros (link), Registrar retiro (secondary), + Nuevo insumo (primary). The shell heading should read "shared by AW02–AW29, AW31", and the overview table "Admin web · `AW01`–`AW31`".

3. **Client `20`–`22` and staff `S18`–`S22` were never listed**, although all of them are built. Add them to their inventories and widen the overview ranges to `01`–`22` and `S01`–`S22`:
   - `20` Recuperar contraseña · `21` Crear contraseña (forced after a first login with a temporary password) · `22` Editar perfil (opens from `18`).
   - `S18` Recuperar contraseña · `S19` Crear contraseña · `S20` Notificaciones (no menu entry — reached from a push, filtered by role) · `S21` Reservas de la clienta · `S22` Historial de la clienta.

4. **The Navigation section only documents the admin web.** Add the two mobile surfaces alongside it:
   - Client app: four-tab bar (Inicio · Reservar · Mis Reservas · Perfil); child screens replace it with a header and back arrow. `01→20`, `01→21` (forced — the client cannot reach `02` until it completes), `18→22`.
   - Staff app: no tab bar for any role. Each role lands on its own root — `S02` Trainer, `S04` Front desk, `S11` Administration, `S15` Nutritionist — and navigates in depth from a header with a back arrow. `S01→S18`, `S01→S19`, `S06→S21`, `S06→S22`.

Everything else in the file — tokens, typography, spacing, the table and side-panel conventions, and the per-screen behaviour notes — is correct and stays as it is.
