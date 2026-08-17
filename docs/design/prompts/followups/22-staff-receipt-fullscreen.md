# Follow-up — Draw the enlarged receipt on Revisar pago (Administración)

Targets: **S12 (Revisar pago, Administración)**. Send as a follow-up.

---

S12 already promises this in its own notes — "Comprobante: toque para ampliar a pantalla completa con zoom; se cierra con un gesto hacia abajo" — and the receipt block carries an **"Ampliar"** control. But none of the three frames draws that state, so the behaviour exists only as prose. It matters more here than on desktop: the Administrator is comparing a phone-sized thumbnail against their bank app before releasing a Subscription (`booking/CONTEXT.md`, *Payment*).

Add a frame, **iOS · Comprobante ampliado**, after the review frame:

- Tapping the receipt or "Ampliar" opens a full-screen viewer on a `rgba(74,58,48,0.92)` ground — near-opaque, because on a phone the receipt is the entire task and nothing behind it needs to stay legible.
- The image fills the width, centred vertically, pinch-to-zoom and pan enabled, no chrome over the image itself.
- A single row over the top safe area: the client's name in 14px on the left so the reader never loses track of whose payment this is, and a 44px close target on the right.
- It closes with a downward drag or the close target, returning to S12 with the review state intact — including a `Motivo del rechazo` field already expanded and typed into.
- No Confirmar / Rechazar inside the viewer: the decision is taken in the screen underneath, where the amount is on display beside it.

Mirror the same state in the **Android** frame's notes with Material density, keeping the drag-to-dismiss gesture.

Nothing else on S12 changes — the summary block, the mandatory rejection reason with its disabled **Confirmar rechazo**, and the "vuelve a S11 con un aviso de 2 s, sin pantalla de resultado" behaviour all stay as they are.
