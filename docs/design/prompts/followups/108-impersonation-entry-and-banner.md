# Follow-up — The «Ver la app como…» entry and the impersonation banner

Targets: **S23 (Perfil · Staff)**, **S02 (Mi agenda · Entrenadora)**, **S04
(Buscar cliente · Asistente)**, **S15 (Mi agenda · Nutricionista)**,
**Sistema de Diseño (Prompt 00)** (one new card, «Franja de suplantación»,
in section «06 · Navegación», after the «Avatar de cuenta» card), and the
**generated handoff `design/README.md`** (the `S24` inventory row, the
«Impersonation banner (Staff)» subsection under «Design tokens», and the
staff navigation bullets). The new screen `S24` has its own full prompt,
[`staff/24-administrator-view-as.md`](../staff/24-administrator-view-as.md).
`S11` does not change: an Administrator is never impersonated, so her root is
never seen under the banner. Send [30](./30-invariants-checklist.md)
alongside this follow-up.

---

Written by FUT-001 on 2026-10-22 ([proposal](../../../implementation/FUT-001-impersonation-proposal.md),
[ADR-0100](../../../adr/0100-impersonate-a-staff-member-from-the-staff-app.md)).
An Administrator signed in to the Staff app can see and act in it as one
active Trainer, Assistant, or Nutritionist for 30 minutes. Two things are
missing on the designed screens: the way in (a row on the Administrator's
Perfil) and the way out (a banner on every screen while it lasts, with
«Salir»).

## 1. `S23` — the «Ver la app como…» row (Administrator only)

In the **iOS · Administración** frame only, the menu group gains a third
row after «Cambiar contraseña», with the same 60 px height, 21 px Palo de
rosa line icon (an «eye» outline: an almond shape with a 3 px circle pupil,
stroke 1.3), the label «Ver la app como…» in 16 px `#4A4A4A`, and the quiet
`#C4BAB6` chevron. It opens `S24`. The Entrenadora frames and the Android
frame do not get it: only an Administrator has the row. Add one line to the
screen's notes: «Administración ve una tercera fila, «Ver la app como…», que
abre S24 (FUT-001).»

## 2. The banner on `S02`, `S04`, `S15` — «Franja de suplantación»

Each of the three roots gains **one new frame**, placed last, captioned
**«iOS · Viendo como»**, that copies the first iOS frame exactly and adds the
banner. The banner is the first thing under the status bar, **above the
screen's own header**, full width, and it stays fixed while the content
scrolls:

- a 44 px strip (plus the status-bar inset above it) on **Palo de rosa
  profundo `#8A5D59`**, text in white, 14 px, weight 500;
- left: a 16 px white outline «eye» icon (the same glyph as §1), then
  «Viendo como Camila Rojas · Entrenadora» (name and Role, the Role word as
  `S23` writes it: Entrenadora / Asistente / Nutricionista), trimmed with an
  ellipsis on one line if long;
- right: «Quedan 28 min» in 13 px white at 0.85 opacity, then «Salir» as a
  text button in white, weight 600, with a 44 px touch target and a pressed
  state of `rgba(255,255,255,0.14)` behind it, labelled «Salir de ver como
  Camila Rojas» for screen readers;
- the strip never covers the header's controls: the header moves down under
  it, keeping its own paddings;
- the account avatar in the header keeps showing the **Staff Member's**
  initials (the app is hers while it lasts), and Perfil (`S23`) opened from
  it shows her read-only data under the same banner, without the «Ver la
  app como…» row.

The sample names: `S02` Camila Rojas · Entrenadora, `S04` Julia Soto ·
Asistente, `S15` Carla Méndez · Nutricionista. The minutes: 28, 12, and 4;
under 5 minutes the number stays white (no colour change: the banner is
already the strongest element on the screen).

Tapping «Salir» returns at once to the Administrator's own root `S11` with
the transient Éxito-tinted notice strip the README already describes for
`05`/`15` («Dejaste de ver la app como Camila Rojas.»); when the 30 minutes
run out, the same return with «Terminó el tiempo para ver la app como Camila
Rojas.». Neither state needs a frame: `S11` is unchanged and the notice
strip is the existing pattern.

Add to each screen's notes: «Si administración está viendo la app como esta
persona, una franja fija en Palo de rosa profundo con su nombre, los minutos
que quedan y «Salir» ocupa la parte superior de todas las pantallas
(FUT-001).»

## 3. Sistema de Diseño — the card

In «06 · Navegación», after the «Avatar de cuenta» card, a white card (1 px
Arena cálida border, radius 16, padding 40) with the eyebrow «Franja de
suplantación» in the same 12 px uppercase 0.16em style, one still 270 px
wide tile showing the strip exactly as §2 draws it over the top of `S02`'s
header («Viendo como Camila Rojas · Entrenadora», «Quedan 28 min», «Salir»),
and the spec line in the 13 px caption style: «Solo cuando administración
ve la app como otra persona (hasta 30 minutos). Fija arriba de todas las
pantallas, sobre la cabecera. Palo de rosa profundo, texto blanco. «Salir»
vuelve a Pagos pendientes.»

## 4. README

- The staff inventory gains the row «`S24` | Ver la app como… |
  Administration — the active Trainers, Assistants, and Nutritionists by
  Role; a row confirms in a sheet and the app re-draws as that Role for 30
  minutes under the banner (FUT-001)».
- The `S23` row gains «; Administración also has «Ver la app como…» (opens
  `S24`)».
- Under «Design tokens», after «Search result rows (`S04`)», a new
  subsection:

  > ### Impersonation banner (Staff)
  >
  > - While an Administrator sees the app as a Staff Member (FUT-001,
  >   ADR-0100), a fixed 44px strip on `#8A5D59` with white 14px text sits
  >   above every screen's header: an eye icon, «Viendo como {name} ·
  >   {role}», «Quedan {n} min» at 0.85 opacity, and «Salir» (weight 600,
  >   44px target, pressed `rgba(255,255,255,0.14)`, label «Salir de ver
  >   como {name}»).
  > - «Salir» or the 30-minute expiry returns to `S11` with the transient
  >   notice strip («Dejaste de ver la app como {name}.» / «Terminó el
  >   tiempo para ver la app como {name}.»). The header avatar shows the
  >   Staff Member's initials meanwhile.

- The staff navigation bullets gain: «`S23→S24` (Ver la app como…,
  Administración only); choosing a person opens that Role's root (`S02`,
  `S04`, or `S15`) under the impersonation banner, and «Salir» returns to
  `S11`.»

## What must remain untouched

Every existing frame of `S02`, `S04`, `S15`, and `S23` (the new frames are
added, nothing is redrawn); `S11`; the rest of the design system and the
README; the `support.js` runtime and the device frames; the checklist's
entry points (the avatar still opens `S23` from every root).
