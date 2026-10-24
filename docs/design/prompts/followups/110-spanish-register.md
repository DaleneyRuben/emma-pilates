# Follow-up — Spanish register on the Role labels and the affected-client notes

Targets: **AW23 (Personal)**, **AW24 (Formulario de personal)**, **S14
(Cancelar sesión · Administración)**, **S12 (Revisar pago · Administración)**
notes, **16 (Mis referidos)**, **17 (Mi crédito)**, and the generated handoff
`design/README.md` (`AW23`/`AW24` rows only). Send
[30](./30-invariants-checklist.md) alongside this follow-up.

---

Written by UX-005 on 2026-10-23 from the UI/UX audit
([UX-001](../../UX-001-uiux-audit.md), findings C3, S4, A1, and X1). Prose
talks about a person of the studio as «clienta», and a Role is named as on
every other screen: «Entrenadora», «Asistente», «Administración»,
«Nutricionista» (`S23`, `AW33`, follow-up 52). `AW23` and `AW24` are the odd
ones out: their Role tag, Rol filter, and 2×2 grid still read «Entrenador»
and «Administrador». `S14` still counts «clientes afectados». `S12`'s visible
copy already says «La clienta verá este mensaje»; only its notes still drift.
`16` and `17` still say «amigo» / «amigos» under a Home tile that says
«amigas» (follow-up 47).

## 1. `AW23` — the Role tag and the Rol filter

In every frame (desktop, filtered, and the 420 px cards), replace the Role
tag and the Rol filter options:

- «Entrenador» becomes **«Entrenadora»**.
- «Administrador» becomes **«Administración»**.
- «Asistente» and «Nutricionista» stay as they are.

The tag stays a compact neutral label, never a status pill. The sidebar item
«Personal», the «+ Nuevo miembro» action, the columns, and the search that
follow-up 59 already removed stay untouched.

## 2. `AW24` — the 2×2 Role grid

In every frame (Nuevo miembro, Nuevo miembro with the Role that holds every
Branch, Editar miembro, the pending frames, and the 420 px sheets), the four
choices read **«Entrenadora»**, **«Asistente»**, **«Administración»**,
**«Nutricionista»**. Choosing **«Administración»** is what replaces the
Branch picker with the read-only «Todas las sucursales (implícito por el
rol)» row. The notes card names the Role «Administración», not
«Administrador».

Nothing else on the panel changes: email and optional phone, the activation
link, «Pendiente de activación», «Cambiar correo», «Reenviar enlace»,
«Cancelar invitación», the read-only contact of an activated member, and the
absence of «Restablecer contraseña».

## 3. `S14` — «clienta afectada»

The count and the warning speak of the person, not of a masculine noun:

- «6 clientes afectados» becomes **«6 clientas afectadas»**. The same for
  «10 clientas afectadas» where that count is drawn.
- The warning's «a cada cliente afectado» becomes **«a cada clienta
  afectada»**. The em dashes stay: removing them is UX-012, not this
  follow-up.
- The result line «Se notificó a los 6 clientes afectados.» becomes **«Se
  notificó a las 6 clientas afectadas.»** A one-person result, if drawn,
  reads «Se notificó a la clienta afectada.»

The Waitlist sentence («También se notificará a las 2 en lista de espera.»)
stays. The destructive button, the summary, and the «Volver» action stay.

## 4. `S12` — notes only

Visible copy already says «La clienta verá este mensaje para corregir y
volver a enviar.» In the notes card, any remaining «el cliente» / «al
cliente» that means the person whose receipt is under review becomes «la
clienta» / «a la clienta». Do not redraw the receipt, the buttons, or the
reject field.

## 5. `16` and `17` — «amigas»

- `16`, every frame: «Cuando un amigo se registre…» becomes **«Cuando una
  amiga se registre y haga su primer pago, ganas crédito.»**
- `17`, the zero-balance frame: «Invita a tus amigos para ganar.» becomes
  **«Invita a tus amigas para ganar.»**

The code card, the share button, the credit row, and «Ver mi código» stay.

## 6. README

- The `AW23` row names the Role tag «Entrenadora», «Asistente»,
  «Administración», «Nutricionista».
- The `AW24` row says choosing **Administración** replaces the Branch picker.
  Do not bring «Restablecer contraseña» back (follow-up 71).

## What must remain untouched

Screen titles that name the record, not a counted person: «Buscar cliente»,
«Nuevo cliente», «Detalle de cliente», «Selecciona un cliente…», «Ver
cliente», «Volver al cliente», and the sidebar item «Clientes» with its
`/back-office/clientes` route. Search placeholders that name the record
(«Buscar por cliente», «Buscar por nombre de cliente») stay. «Asistente» and
«Nutricionista» do not change. Sample names, amounts, and the rest of every
frame stay as drawn.
