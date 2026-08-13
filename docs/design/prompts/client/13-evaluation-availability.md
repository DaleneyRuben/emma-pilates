# Prompt 13 — Evaluation Availability

Client mobile app. Reached from Home's "Evaluación nutricional" quick action (Prompt 02) or from Perfil. References Prompt 00 for style. Prompt 14 (Book Evaluation) chains from this one.

---

Using the Emma Pilates Studio design system (Prompt 00), design the **Evaluation Availability** screen of the client mobile app — where a client browses open slots for a Nutritionist Evaluation.

**Language:** all visible copy is neutral Spanish (Bolivia), informal "tú" address.

**Navigation chrome:** bottom tab bar present, "Perfil" active; a back arrow in the header returns to Perfil (or Home).

**Layout, top to bottom:**
1. Header: back arrow, title "Evaluación nutricional".
2. Short explanatory text: "Reserva tu evaluación gratuita con la nutricionista. Tienes una evaluación disponible por mes."
3. A horizontally scrollable date picker (same style as Browse Sessions), showing only days that have open Availability Blocks.
4. A grid of time slot buttons for the selected date (e.g. "09:00", "09:30", "10:00"), each a fixed-length bookable slot.

Tapping a slot navigates to Book Evaluation (Prompt 14).

**Show a second frame for the "already used this month" state**: the date picker and slot grid are replaced with a calm message, "Ya usaste tu evaluación de este mes." with a supporting line noting when the next one becomes available — no call-to-action, since nothing can be done until next month.

Generous whitespace, consistent with the rest of the app.
