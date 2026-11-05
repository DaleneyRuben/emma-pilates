# Follow-up — Corrections to the staff profile photo proposals

Targets: the proposal boards of [240](./240-staff-profile-photo-proposals.md)
(`design/v2/propuestas-foto-equipo/`), on the same canvas. Send
[30](./30-invariants-checklist.md) alongside. Still proposals only: no
exported screen outside that folder changes.

---

Written on 2026-11-05 after an independent review of 240 (DES-008). 240 is
sent and stays as written; from here on, read it with these corrections.

## 1. Invariant 9 and follow-up 67 §1

240 amended only 67 §2. From here on, read 67 §1 and checklist 30 §9 as
follows. The **admin web's top bar account chip** shows the signed-in
person's photo when she has one, and the initials otherwise. The Client
app's header avatar on C02 stays the two initials, never a photo. The Staff
app has no header avatar since 225 §8 (Perfil is a tab), so nothing changes
there.

## 2. The controls follow the v2 C22 board

A's «Cambiar foto» is the secondary button that the exported v2 C22 draws
(`design/v2/cliente/C22-Editar-perfil.dc.html`), not 63's text links, with
«Quitar foto» as a text button beside it. The build moves C22 to the same
pattern.

- **Quitando** works as the built client photo does
  (`profile-photo-section.tsx`): the initials come back at once and the
  controls read «Quitando foto…». There is no veil over the photo. The veil
  (Marfil at 55 %, not 50 %, with the busy ring) is only for **Subiendo**.
- **The crop note** uses the built wording, «Se recorta al centro en forma
  de círculo.», only while a photo shows, on every editor: phones and web,
  in both proposals.
- **The web file line** «JPG, PNG o WebP, hasta 10 MB.» shows on every
  web editor, A and B.

## 3. Sizes

- The Personal list at 1440 and 420 uses 40 px.
- Every inline photo beside a name is 20 px, including Horario at 420.
- C04's «Entrenadora» row already drew an initials circle. In A that
  circle becomes her photo.

## 4. B's web

- The panel shows the file line under the name instead of «Entrenadora ·
  Activa».
- A new state, «Arrastrar una foto», draws the drop target: a dashed Palo
  de rosa outline around the circle and «Suelta la foto aquí» over it. That
  label is new copy.

## 5. Copy outside the photo is the exported copy

- **C03:** «Hoy 2» comes first, and «mar 3» is the selected day.
- **C04:** keeps «Sobre la clase» and its text, and closes with «Se
  descuenta 1 clase de tu plan» and «Reservar».
- **C05:** the title is «Mis reservas», and the «Hoy 2» card keeps «faltan
  menos de 2 h 30» and «Reprogramar». That card's line names no trainer,
  so it shows no photo.
- **HOR (Coordinación):** keeps the «Cancelar una clase» row and «Solo
  lectura. Para reservar, abre la ficha de una clienta.»
- **S23:** keeps the Notificaciones count «2» and the footer «Emma Pilates
  Studio · versión 1.0».
- **S23 roles:** the summary block (circle, controls, note) is the same on
  every role's S23. The Entrenadora board stands for all of them, and 240's
  «every role» means that block.

## 6. Sample data

- On the web «Sin foto», «Subiendo», «No se pudo subir», «Archivo no
  válido» and «Quitando» states, Daniela's row in the list shows «DO»,
  matching the panel.
- Horario at 420 lists only Tuesday's classes.
- The apps keep Achumani and `@emmapilates.bo`, and the web keeps P07's
  Centro and Urubó with `@example.com`, as each surface's export already
  does.

## 7. Accessibility

Every tappable row, back control, menu control and Horario block is a
`<button>`. Tapping a sheet's or panel's backdrop also closes it; the
visible «Cancelar» and close buttons stay.
