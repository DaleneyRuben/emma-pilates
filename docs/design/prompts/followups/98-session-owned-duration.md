# Follow-up — A Session owns its duration

Targets: **AW03 Formulario de Sesión** (every create and edit frame);
**AW06 Tipos de Clase** (the table); **AW07 Formulario de Tipo de Clase**
(every form frame and the notes column); **generated handoff
`design/README.md`** (the `AW03`, `AW06`, and `AW07` inventory rows). Send
[30](./30-invariants-checklist.md) alongside this follow-up.

---

Written by WEB-027 on 2026-10-16. The owner decided that how long a class
lasts is chosen when it is scheduled, not on its Class Type
([booking ADR-0004](../../../../booking/docs/adr/0004-session-owns-its-duration.md)):
the studio runs the same kind of class at different lengths. A Class Type
no longer has a duration. A one-off Session and each weekly row carry their
own, prefilled with **60 minutes**. This replaces the read-only «50 min»
that [97](./97-weekly-multi-day.md) drew in each weekly row.

## The «Duración» control

Reuse AW07's existing duration control exactly, moved here: the label
«Duración» in the field label style (10.5 px uppercase, `0.14em`,
`#766D69`), a 44 px box (1 px `#D8C9BB`, radius 8, white) holding a number
input (14 px `#4A4A4A`) and the fixed suffix «min» on the right (12 px
`#766D69` on `#FDFAF6`, 1 px `#EFE6DC` left border). Values run from 5 to
240. Outside that range the box takes the Error `#B25D4B` border and the
11.5 px Error line «Entre 5 y 240 minutos.» sits under it. Screen readers
hear «Duración, en minutos».

## 1. AW03 one-off frames

In **«Escritorio · Nueva sesión»**, **«Escritorio · Nueva sesión desde un
espacio libre»**, and **«Escritorio · Editar sesión»**, add «Duración»
between «Hora» and «Capacidad», full width like its neighbours. Both «Nueva
sesión» frames show **60**. «Editar sesión» shows the Session's current
**50**. Under it in the two create frames, the 11.5 px `#7A716D` helper
«Empieza en 60 minutos; cámbiala si esta clase dura distinto.». In «Editar
sesión», the existing line «Si cambias el día o la hora, avisamos a las
clientas con reserva.» stays where it is; a new duration alone sends no
notice.

## 2. AW03 weekly frames

In **«Escritorio · Nueva sesión · Cada semana»** and its **«día repetido»**
frame, each row of «Días y horas» swaps the read-only «50 min» text for a
compact Duración control: the row grid becomes `minmax(0,1fr) 96px 96px
30px`, and the third cell is the same 44 px box with the input and «min»
suffix (no label of its own; screen readers hear «Duración, fila 1, en
minutos»). «+ Agregar día» copies
the last row's duration along with its time. Draw **Lunes 07:00 · 60**,
**Miércoles 07:00 · 60**, **Viernes 18:30 · 90**. The helper under the group
becomes «Cada día puede durar distinto; empieza en 60 minutos.». The «día
repetido» frame keeps its two Lunes 07:00 rows and its Error line; its
overlap wording stays «Se cruza…», now measured with each row's own
duration. Change the caption line to «Varios días, cada uno con su hora y
su duración · genera 30 días hacia adelante».

## 3. AW03 «Escritorio · Editar sesión · Esta y las futuras»

Add «Duración» between «Hora» and «Capacidad», showing the series' **50**.
Nothing else in the frame changes.

## 4. AW06 Tipos de Clase

Remove the «Duración» column header and every row's «45 min / 50 min / 55
min» cell. The grid becomes `2fr 1fr 1.9fr` (Nombre, Capacidad, Equipo
necesario) with everything else as drawn.

## 5. AW07 Formulario de Tipo de Clase

In **«Escritorio · Nuevo tipo de clase»**, **«Escritorio · Editar tipo de
clase»**, and the narrow frame, remove «Duración». «Capacidad» keeps its
control and «pers.» suffix and takes the whole row. In the notes column,
replace «Duración y capacidad juntas» with **«Sin duración»**: «Cada clase
define su duración al programarla en el horario (AW03); el tipo de clase
solo sugiere la capacidad.». Change «Sesiones ya creadas» to «No se
reescriben: los cambios se aplican a las sesiones que se generen desde
ahora. Un tipo se archiva, nunca se borra…», dropping any word about
durations if the note has one; keep the rest of the note as written.

## 6. Generated handoff `design/README.md`

The `AW03` row says every create and edit frame carries «Duración» (5–240
minutes, 60 to start), each weekly row its own. The `AW06` and `AW07` rows
say a Class Type has no duration.

## Leave untouched

Every other frame, the «Cancelar sesión» and «Terminar la serie» frames,
the admin navigation, colours, spacing, and all copy not named above.
