# Follow-up — Visual system v2 (warm surfaces, one spacing scale, no loose links)

Targets: **`Sistema de Diseño`**, plus three sample screens redrawn on the new
system so the owner can judge it on real content: **`02` Inicio** (with and
without a Plan), **`09` Detalle del Plan**, and **`05` Mis Reservas**. Send
[30](./30-invariants-checklist.md) alongside this follow-up. Nothing else is
regenerated yet: every other screen moves to v2 in later follow-ups, once the
owner approves this one.

---

Written on 2026-11-02 after the owner walked both apps by hand
([review](../../../reviews/2026-11-02-hand-walkthrough.md), DES-002). Her
verdict, screen after screen: the colour combination is ugly, the white cards
look cheap on the ivory background, there is too much plain text, the spacing
is uneven, and loose underlined links («Ver historial», «Ver detalle»,
«Volver al inicio») look unfinished. She asked for the whole of both apps to
be redesigned, starting with the system.

From here on, read these sections of `Sistema de Diseño` from this follow-up.
Where v1 and v2 disagree, v2 wins.

## 1. Colour: warm surfaces instead of white

| Token | v2 value | Use |
| --- | --- | --- |
| Marfil | `#FAF7F2` (unchanged) | Screen background |
| **Lino** (new) | `#F5EFE9` | Every card, list group and input fill. Replaces Blanco `#FFFFFF` as a surface. |
| **Rosa tinte** (new name for the existing tint) | `#F2E4E1` | Icon discs, secondary buttons, selected chips, the unread pill's ground |
| **Rosa profundo** (new) | `#93615D` | The one emphasis surface per screen (hero card, toast). White text on it is 5.1:1. |
| Palo de rosa | `#B78380` (unchanged) | Primary buttons, the active tab, line icons |
| Rosa enlace | `#7D4F4B` (was `#8A5D59`) | Text buttons and secondary-button labels: 5.9:1 on Lino |
| Plomo cálido | `#4A4A4A` (unchanged) | Body text |
| Texto tenue | `#6F6662` (was `#766D69`) | Notes and labels: 4.9:1 on Lino |
| Error | `#A04E3E` (was `#B25D4B`) | Destructive labels: 5.0:1 on Lino |
| Arena | `#E6DBD0` (was `#D8C9BB` for dividers) | Hairline dividers inside a list group and input borders only |

Rules:

- **No white surfaces.** Blanco survives only as text and icons on Rosa
  profundo and on solid buttons.
- **Cards have no border and no shadow.** Lino on Marfil is the separation.
- **One emphasis per screen.** Only the screen's main card (the Plan on
  Inicio, the price on Detalle del Plan) uses Rosa profundo. Everything else
  is Lino.
- **Green and amber are for status pills only.** Success, pending and error
  screens, toasts and notices use the brand colours (§6, §7), never the
  system green `#7C9473` or the amber block.

## 2. One spacing scale

4 · 8 · 12 · 16 · 24 · 32 · 48. Screen side margin 20. Between sections 24.
Inside a card 16 (20 on the hero). A section title sits 12 above its group.
Rows inside a group have 0 gap and a hairline Arena divider inset 64 from
the left (past the icon). No other values.

## 3. Text: rows instead of paragraphs

- A screen has at most one short paragraph (two lines). Facts go in **icon
  rows**: 56 min height, a 36 px Rosa tinte disc holding an 18 px Palo de
  rosa line icon (1.5 stroke), the label in Work Sans 16 Plomo, an optional
  value on the right in Texto tenue, and an optional quiet chevron.
- Section titles: Work Sans 500, 12, 0.12em, uppercase, Texto tenue.
- The screen title stays Lora 30. Card titles Lora 20. Prices and big
  numbers Lora 32 tabular.

## 4. Buttons: no loose links

| Kind | Look | Example |
| --- | --- | --- |
| Primary | Palo de rosa, white Work Sans 600 17, 52 high, radius 14, full width | «Reservar clase» |
| Secondary | Rosa tinte fill, Rosa enlace label, 52 high, radius 14, no border | «Ver historial» |
| Text | Rosa enlace, Work Sans 600 15, no underline, 44 tap height | «Ahora no» |
| Destructive | Secondary shape with an Error label on `#F7E5E0`; the confirming button inside its sheet is solid `#A04E3E` | «Cancelar reserva» |
| On emphasis | White pill, Rosa profundo label, 44 high | «Comprar un plan» on the hero card |

Underlined text links are removed from both apps. Every «Ver …» becomes a
secondary button, a tab, or a row with a chevron.

## 5. The hero card

Rosa profundo, radius 20, padding 20. An eyebrow label in white at 70 %, a
Lora 24 white title, one line of white 85 % text, and at most one «On
emphasis» button. A discount shows as a pill: white text on white 18 %,
«15 % de descuento». Draw it twice: Inicio's Plan card (classes left in Lora
32, a white progress bar on white 25 %, «Vence el 1 de diciembre») and
Inicio's no-plan card («Elige tu plan y empieza a moverte», «Paquetes desde
Bs 80. Puedes pagar en el estudio o desde la app.», «Comprar un plan»).

## 6. State screens (empty, pending, success, error)

Centred both ways in the space between the top bar and the tab bar. A 72 px
disc (Rosa tinte; `#F7E5E0` for errors) holding a 32 px line icon in Rosa
profundo (Error for errors), a Lora 24 title, one Texto tenue note of at most
two lines, a primary button, and an optional text button. The same block,
without the vertical centring, is the in-list empty state. Draw: «Tu pago
está en revisión» («Nuestro equipo está revisando tu comprobante. Suele
tomar unos minutos en horario de atención. Te avisaremos apenas esté
listo.», «Volver al inicio»), «¡Pago registrado!», and the empty Próximas
of §9.

## 7. Toast and notice

- **Toast** (replaces the green «Reserva confirmada» card that vanishes after
  a few seconds): Rosa profundo, radius 14, white text, a check icon, 16
  above the tab bar, full width minus the margins. It stays until closed (×)
  or the screen changes.
- **Notice** (replaces the amber «Esto no se puede deshacer» block): a Lino
  card with a 4 px left bar (Advertencia for a warning, Error for a
  destructive consequence), an icon, and one line.

## 8. Navigation: the staff app gains a tab bar

v1 §06 says the staff app has no tab bar. From here on it has one, drawn like
the client's, with these tabs per role (owner, 2026-11-02): Entrenadora
**Agenda · Mis pagos · Perfil**; Asistente **Clientes · Horario · Caja ·
Perfil**; Nutricionista **Agenda · Disponibilidad · Perfil**; Administración
**Pagos · Clientes · Horario · Perfil**; Coordinación **Clientes · Para
contactar · Horario · Perfil**. Perfil replaces the avatar on every staff
root. Only `Sistema de Diseño` §06 changes in this follow-up; the staff
screens move later. In the client app the unread pill moves from the Perfil
tab to a bell on Inicio (§10).

## 9. Sample: `05` Mis Reservas

A segmented control **Próximas | Historial** under the title (`07` becomes
the Historial tab). Booking cards in Lino: time and class in Lora 20, the
Trainer and Branch as one icon row, and «Cancelar» as a Destructive button
(«Reprogramar» as Secondary inside the 2 h 30 window). Draw the empty
Próximas: calendar icon, «Aún no tienes reservas», «Cuando reserves una
clase, aparecerá aquí.», «Reservar una clase». Draw the toast «Reserva
confirmada · Te quedan 9 clases en tu plan» over the list.

## 10. Sample: `02` Inicio

The greeting, then on the right a bell (with the unread pill) and the
avatar. The hero card of §5. «Accesos rápidos» as three Lino tiles with a
36 px Rosa tinte icon disc each (Reservar una clase, Evaluación nutricional,
Invita a una amiga); the locked tile without a Plan at 60 % opacity with a
lock icon.

## 11. Sample: `09` Detalle del Plan

The hero card: «12 clases», «Válido por 30 días», ~~Bs 820~~ and Bs 697 in
Lora 32, the «15 % de descuento» pill. «Qué incluye» as three icon rows
(«12 clases en cualquier sucursal», «Cancela sin costo hasta 2 h 30
antes», «30 días desde la fecha de inicio»). «Fecha de inicio» as its own
section with the day chips. «Desglose» as rows: Precio Bs 820 · Descuento
−Bs 123 (Rosa enlace) · Total Bs 697 (Lora 22). The primary «Pagar Bs 697»
fixed at the bottom over a Marfil fade. No «Siguiente paso» paragraph: one
Texto tenue line above the button, «Pagas por QR y subes tu comprobante».
