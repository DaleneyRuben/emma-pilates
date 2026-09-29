# Follow-up — Perfil gains «Cerrar mi cuenta» (BE-007)

Targets: **Client `18`**, and the new screen **Client `24`** (full prompt in
[`../client/24-close-account.md`](../client/24-close-account.md)). Send
[30](./30-invariants-checklist.md) alongside this follow-up, and send the `24`
prompt in the same message so the link has somewhere to go.

---

BE-007 G2 lets a Client close their own Account from the app
(`docs/implementation/BE-007-data-governance-proposal.md`). Apple's App Store
guideline 5.1.1(v) requires an app that creates accounts to let people delete
them from inside the app, so the entry must be easy to find on Perfil.

## 1. `18` — A quiet «Cerrar mi cuenta» link

- Under the muted «Cerrar sesión» button, centered, add a text link
  **Cerrar mi cuenta** in the Error tone, at the small text size, with
  generous space above it so it cannot be tapped by mistake for «Cerrar
  sesión».
- It is a link, not a menu row and not a button: closing an Account is not one
  of Perfil's everyday destinations.
- Tapping it opens `24` (a child screen, no tab bar); `24`'s back arrow and
  «Cancelar» return here unchanged.
- Nothing else on `18` changes: the summary card with «Editar», the five menu
  rows, «Cambiar contraseña», and the muted «Cerrar sesión» button all stay as
  drawn (follow-ups 16, 63, and 64 included).

## 2. Invariants — a new entry point that cannot disappear

Add to the entry-point table of follow-up 30 §6 (that file stays unedited; this
follow-up carries the addition): **«Cerrar mi cuenta» link · `18` → `24`**. It
is the only route to `24`; if the link goes, Clients cannot close their own
Account from the app.

## Preserve everything else

Do not change the tab bar, the account avatar route to `18`, the closed
palette, the invariants of follow-up 30, or any screen not named in Targets.
