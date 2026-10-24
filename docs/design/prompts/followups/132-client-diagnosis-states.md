# Follow-up — Client diagnosis states

Targets: `04 Detalle de Sesión` (the full-class action zone inside the
Cancellation Window), `05 Mis reservas` and `06 Reprogramar` (the named
refusal lines), `18 Perfil` (the version footer), `22 Editar perfil` (the
phone error). Send [30](./30-invariants-checklist.md) alongside.

---

Written by MOB-070 on 2026-10-23. The Client app now refuses these cases
before or instead of «Inténtalo de nuevo», and the frames still draw the
happy path only. The sample «2 h 30» stays a sample (follow-up 131).

## 04 · a full class inside the window

On the full-class frame, when the Session starts inside the Cancellation
Window, the action zone holds no «Unirme a la lista de espera». It holds one
muted note, centred: «Falta poco para la clase, así que la lista de espera
ya cerró.» Outside the window the outlined button and «Clase llena. Te
avisaremos si se libera un cupo.» stay as they are.

## 05 and 06 · a named refusal

A refused cancellation on `05` and a refused reschedule on `06` show one
Error-text line (an alert) naming the problem code, never «Inténtalo de
nuevo»:

- window: «Ya no se puede cancelar: falta menos que la ventana de
  cancelación.» on `05`; «Solo puedes reprogramar dentro de la ventana de
  cancelación.» on `06`;
- destination not eligible: «Esa clase no está disponible para reprogramar.»
  on `06`;
- full: «La clase ya no tiene cupos.» on `06`;
- weekly cap (arrives with BKM-007): «Ya alcanzaste el máximo de clases de
  esta semana.»;
- before the start date (arrives with BKM-006): «Tu plan todavía no empieza:
  podrás reservar desde su fecha de inicio.»

Any other failure keeps «No pudimos cancelar la reserva. Inténtalo de
nuevo.» or «No pudimos reprogramar la reserva. Inténtalo de nuevo.»

## 18 · the version

The footer reads «Emma Pilates Studio · versión {app version}», the version
from the app config (today 1.0.1), not a fixed «versión 1.0».

## 22 · a phone that is not a Bolivian mobile

**Teléfono** refuses, under the field, «Escribe un celular de Bolivia, por
ejemplo +591 71234567.» A blank field still clears the phone. A Bolivian
mobile is `+591` and eight digits starting with 7.

## Leave untouched

Every other frame, the Waitlist offer outside the window, and checklist 30.
