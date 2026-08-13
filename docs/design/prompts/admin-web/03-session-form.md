# Prompt AW03 — Session Form

Admin desktop web. Chains from Prompt AW02 (Horario) — reached via "+ Nueva sesión" or by clicking an existing Session block. Same shell as AW02, shown as a side panel or modal over the schedule grid rather than a full page navigation, so the Administrator keeps their place in the week.

---

Using the Emma Pilates Studio design system (Prompt 00) and the same shell as Horario (Prompt AW02), design the **Session Form** — a side panel that slides in over the schedule grid, used to create or edit a Session.

**Language:** all visible copy is neutral Spanish (Bolivia), informal "tú" address.

**Responsive:** on desktop this is a right-side panel over the grid; on narrow widths (see Admin Desktop Web Responsiveness) it becomes a full-screen sheet instead of a partial panel.

**Layout, top to bottom:**
1. Panel header: title "Nueva sesión" (create) or "Editar sesión" (edit), close icon.
2. Field: "Tipo de clase" (dropdown, from the Class Type catalog).
3. Field: "Entrenador" (dropdown, filtered to Trainers assigned to the selected Branch) — editing this field on an existing Session is how a Trainer swap happens, no separate flow needed.
4. Field: "Fecha" and "Hora" (date and time pickers).
5. Field: "Capacidad" — pre-filled from the selected Class Type's default capacity, editable (e.g. reduced when equipment is out of service).
6. A "Guardar" primary button (Palo de rosa fill).

**Show two frames**: **Nueva sesión** (empty form) and **Editar sesión** (pre-filled with an existing Session's values, plus a secondary "Cancelar sesión" text link at the bottom in the Error semantic color — the same underlying action as the admin mobile app's emergency cancellation, Prompt AM05: it refunds every affected Booking and notifies the clients. It's reachable here too since an Administrator already editing the schedule at a desk shouldn't have to switch to their phone for it).

Clean desktop density, consistent with the schedule grid.
