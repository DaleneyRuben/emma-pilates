# Follow-up — Draw the enlarged receipt on Revisar pago (Web Admin)

Targets: **AW29 (Revisar pago, Web Admin)**. Send as a follow-up.

---

AW29 wraps the receipt thumbnail in a button captioned "captura del comprobante · JPG" with a magnifier icon and the label **"Ver en grande"** — but no enlarged state is drawn in either frame, so the control leads nowhere. This is the one thing the Administrator has to actually read before deciding: `booking/CONTEXT.md` says a transfer Payment "stays pending, granting nothing, until an Administrator checks that screenshot against the money in the bank", and rejection reasons are meant to be specific ("el monto no coincide"). Confirming money against a panel-width thumbnail is exactly the risk this screen exists to remove.

Add a frame, **Escritorio · Comprobante ampliado**, between the default state and the rejection state:

- Clicking the receipt (or "Ver en grande") opens a full-window overlay above both the panel and the list, on the design system's scrim `rgba(74,58,48,0.22)` deepened to `rgba(74,58,48,0.55)` — the image has to win against the page, and this is the only overlay in the admin web that sits on top of another overlay.
- The receipt sits centred, at its natural aspect ratio, capped at `90vh` / `min(900px, 90vw)`, on a white plate with 1px `#E4D8CC`, radius 12 and the popover shadow.
- Above the plate, a single 12px `#FAF7F2` line: the filename on the left, a 30px square close button on the right (1px `#E4D8CC`, `#FAF7F2` fill, hover border `#B78380`) — same close control as the panel header.
- Closing returns to AW29 with the panel exactly as it was: same payment open, and if the rejection field was already expanded with text in it, that text is still there. Esc and a click on the scrim also close.
- No actions live in the viewer. **Confirmar pago** and **Rechazar** stay in the panel footer underneath — the viewer is for reading, and money is never confirmed from a state that hides the amount it belongs to.

Add the matching **Navegador angosto · 420 px** treatment to the existing narrow frame's notes: the viewer is a full-screen sheet with the close button pinned top-right, the image fitted to the width.

Nothing else on AW29 changes — the summary grid (Monto a verificar / Fecha / Método), the mandatory `Motivo del rechazo` flow with its disabled **Confirmar rechazo**, the footer actions and the dimmed AW28 table behind the panel all stay exactly as they are.
