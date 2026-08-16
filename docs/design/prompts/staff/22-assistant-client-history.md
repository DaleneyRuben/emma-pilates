# Prompt S22 — Historial de la clienta (Assistant)

Staff app, Assistant role. Chains from Prompt S06 (Client Overview) — reached by tapping "ver todo" (phone) or "Ver historial completo" (tablet) on the Historial card (see Follow-up 10, which wires those links). No screen chains from this one — it's a read-only report, same scope as the client app's own Class History.

---

Using the Emma Pilates Studio design system (Prompt 00) and the same structure as the client app's Class History screen (Prompt 07), design the **Historial de la clienta** screen of the staff app, as seen by an Assistant reviewing a selected client's full attended-class record.

**Language:** all visible copy is neutral Spanish (Bolivia), informal "tú" address.

**Responsive:** phone gets the full-width single-column layout described below; tablet keeps this as the right-hand detail panel next to Client Search, same split as Client Overview (Prompt S06).

**Navigation chrome:** a back arrow in the header returns to Client Overview. A persistent banner below the header reads "Viendo historial de: [Nombre del cliente]", same treatment as the banner on Reservas de la clienta (Prompt S21).

**Layout, top to bottom:**
1. Header: back arrow, title "Historial de clases".
2. "Viendo historial de: [Nombre del cliente]" banner.
3. A list of past attended classes — Bookings whose Attendance was recorded as attended — grouped by month (e.g. "Agosto 2026", "Julio 2026" as section headers), each entry showing Class Type name, Trainer name, Branch, and date. Purely informational — no actions, no status badges, identical fields to the client app's own history entries.

If the client has no history yet, show an empty state: "Esta clienta aún no tiene clases en su historial." with no call-to-action needed.

Generous whitespace, consistent with the rest of the staff app. Reads as a calm, passive record — same tone as Prompt 07.
