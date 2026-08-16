# Follow-up — Fix the cancellation-window copy (6 h → 2 h 30)

Targets: **Sistema de Diseño (Prompt 00)** and **S14 (Cancelar Sesión, Administración)**. Send as a follow-up on each surface.

---

Two screens still carry a cancellation window that no longer matches the domain. `booking/CONTEXT.md`'s Cancellation Window entry defines it as **the 2.5-hour period immediately before a Session's start time**, and every other screen in the three apps says "2 h 30" (`05`, `09`, `S21`).

1. **Sistema de Diseño — typography specimen**: the "Cuerpo · Work Sans 400 · 15/1.6" sample reads "Puedes cancelar sin costo hasta **6 horas** antes del inicio de la clase. Después de ese plazo **se descuenta la sesión de tu paquete**." Both halves are wrong, and this file is the one the handoff tells implementers to read first.
   - The window is 2 h 30, not 6 horas.
   - Nothing is deducted after the window closes. A Booking consumes its allowance unit the moment it is created; inside the window the Booking simply can no longer be cancelled, and Reschedule is the only option left.
   - Replace the sample with copy that says exactly that, keeping the same length so the specimen still shows a full paragraph of body text — e.g. "Puedes cancelar sin costo hasta 2 h 30 antes del inicio de la clase. Después de ese plazo solo puedes reprogramar a otra clase del mismo día."

2. **S14 — Cancelar Sesión**: the notes grid says the class is refunded to every booking "incluso fuera del plazo de **6 h**". Change to "2 h 30". The rule itself is right — an Administrator cancelling a Session refunds every client's allowance unit even inside the Cancellation Window, because the fault is the studio's — only the figure is wrong.

Nothing else on either screen changes. The 2 h 30 figure already used on `05`, `09` and `S21` is correct and stays as it is.
