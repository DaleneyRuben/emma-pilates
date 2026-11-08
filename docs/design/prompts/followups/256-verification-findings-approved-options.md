# Follow-up — Verification findings 42–46: the owner's choices

Targets: the same screens as [255](./255-verification-findings-42-46-proposals.md).
A decision record over 255's export in `design/v2/propuestas-verificacion/`;
no board is regenerated. Send [30](./30-invariants-checklist.md) alongside.

---

Written on 2026-11-06 for DES-014. The owner picked «1. A 2. C 3. A 4. B».

From here on, read these boards of `design/v2/propuestas-verificacion/` over
the v2 screens they differ from:

1. **n.º 42 — A «Mes en cada día»** (`F-A1`, `F-A2`). Every day of a
   «Fecha de inicio» strip shows the weekday, the day number and the
   abbreviated month in lower case («dic», «ene»), in the same 11 px muted
   style as the weekday; the tile grows to 72 high. It applies to the
   shared strip (S10 Registrar pago, C09 renewal) and to the first plan's
   strip, whose «Hoy» and «Día de apertura» tiles keep their labels.
2. **n.º 43/44 — C «Rojo como el equipo»** (`P-C1`, `P-C2`). «Cerrar sesión»
   is the Error last row of Cuenta in both apps (Error disc and label, no
   chevron), as S23 already draws it. On C18 «Cerrar mi cuenta» is no longer
   a red button: it is a small muted underlined link after the version line,
   «Emma Pilates Studio · versión 1.0 · Cerrar mi cuenta», still opening
   C24 as it is.
3. **n.º 45 — A «Miniatura y visor»** (`V-A1`, `V-A2`, `V-A3`). A PDF
   invoice shows its first page like a photo, with a «Ver · N páginas» pill;
   a tap opens a dark full-screen viewer («Factura · 1 de N», pages stacked,
   pinch to zoom, ✕, «Compartir» and «Descargar»). The Staff app shows the
   same thumbnail and viewer instead of «El PDF se abre desde la web de
   administración». The admin web keeps the browser's PDF view.
4. **n.º 46 — B «Todo al centro»** (`R-B1`, `R-B2`). On the short
   authentication screens (Revisa tu correo, contraseña enviada, cuenta
   activa, enlace vencido or invitación inactiva, in both apps) the badge,
   title, text and buttons sit together as one block centred vertically.
   This replaces C01c's and C20b/C21b/C21c's buttons at the bottom.

Untouched: copy, tokens, every other row and screen.
