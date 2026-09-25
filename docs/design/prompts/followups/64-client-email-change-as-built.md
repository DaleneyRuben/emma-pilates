# Follow-up — Changing the email from Editar perfil as IDN-008 built it

Targets: **Client `22`**. Send this alongside [30](./30-invariants-checklist.md),
[33](./33-email-only-authentication.md), and [63](./63-client-profile-photo-as-built.md),
which it completes (a sent follow-up is never edited).

---

ADR-0029 left the change of an already verified login address to "a separate,
stricter policy". IDN-008 decided it
(`docs/implementation/IDN-008-email-change-proposal.md`): the new address is
written only after a Verification Link sent to it is opened; the old address
is told; Authentication Sessions stay valid. MOB-008 had left the field
read-only with «Para cambiar tu correo, escríbenos al estudio.»; that note is
gone. Draw what ships.

## 1. `22` — The field is editable and saving asks for the change

- **Correo electrónico** is an ordinary editable field again, pre-filled
  with the current address, email keyboard, validation «Escribe un correo
  válido.».
- **Guardar cambios** saves name and phone as before. When the address
  differs from the current one (compared trimmed and lowercased), the app
  also asks for the change and **stays on `22`**: the field goes back to the
  current address and a card appears under it (§2). When the address did not
  change, the screen returns to `18` as now.
- The same address as today is never sent; a malformed one is refused by the
  field.

## 2. `22` — The pending card

A Palo de rosa tinte card under the email field, present while a change is
pending (also when the Client reopens `22` later):

- Title **Revisa tu correo nuevo** (Work Sans 17/500 in Palo de rosa
  profundo).
- Body: «Te enviamos un enlace a {correo nuevo}. Ábrelo dentro de 24 horas
  para confirmar el cambio; hasta entonces sigues entrando con tu correo
  actual.»
- Two text links side by side: **Reenviar correo** and **Cancelar cambio**.
  Reenviar shows the line «Te enviamos otro enlace.» under the links whether
  or not an email went out (ADR-0029: a throttled resend answers neutrally
  and keeps the current link). Cancelar removes the card at once, no
  confirmation. A failed call shows «No pudimos reenviar el correo. Inténtalo
  de nuevo.» / «No pudimos cancelar el cambio. Inténtalo de nuevo.» in the
  same place.
- No countdown, no «enviado a las», no way to see or copy the link.

## 3. The link's screen (new frame, any state of the app)

Opening the link from the new mailbox shows a full screen without the tab
bar, signed in or not: heading **Confirmando tu correo** and «Estamos
confirmando tu enlace.», then one of

- **Tu correo cambió** — «Desde ahora inicia sesión con tu correo nuevo.»
- **Enlace vencido** — «Este enlace venció o ya fue utilizado. Pide el
  cambio de nuevo desde Editar perfil.»
- **Enlace no válido** — «Este enlace no es válido.»
- **Correo no disponible** — «Ese correo ya está en uso. Pide el cambio con
  otro correo desde Editar perfil.»

with one primary **Continuar** that returns to where the app was (`02` when
signed in, `01` otherwise). No password, no session is created, and the
signed-in session keeps working.

## 4. `18` — Nothing changes

The summary card shows the current login address; a pending change is only
visible on `22`.

## Preserve everything else

Do not change the name and phone fields, the photo section of 63, the button,
or any screen not named in Targets.
