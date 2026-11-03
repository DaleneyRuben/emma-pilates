# Follow-up — Attendance opens when the class starts; no app version on feedback

Targets: staff `S03` Lista de asistentes (`design/v2/equipo/S03-Lista-asistentes.dc.html`)
and the «Enviar comentarios» frames of both apps. Read with [225](./225-visual-system-v2.md)
and the invariants in [30](./30-invariants-checklist.md).

---

Written on 2026-11-03. Two decisions of the owner, made while reviewing the
store screenshots:

1. **A Trainer marks attendance from the moment the class starts**, during it
   and after it; there is no closing time. On `S03`, the note under an
   upcoming class reads «Podrás marcar asistencia cuando empiece la clase.»
   (it read «…cuando termine la clase.»), and the note wraps to a second line
   instead of running off the row. Once the class has started, the frame is
   the attendance frame with «Guardar asistencia».
2. **«Enviar comentarios» never mentions the app version, the build, the
   system or the Role.** They travel with the comment on their own. Remove the
   line «Junto con tu comentario enviamos la versión de la app (…), el sistema
   (…) y tu rol. No enviamos capturas de pantalla.» wherever a frame still
   draws it (prompt 25).

## Leave untouched

Every other board and line of these frames.
