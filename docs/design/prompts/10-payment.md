# Prompt 10 — Payment

Client mobile app. Chains from Prompt 09 (Plan Detail) — reached by tapping "Continuar al pago". Prompt 11 (Payment Status) chains from this one.

---

Using the Emma Pilates Studio design system (Prompt 00) and consistent with Plan Detail (Prompt 09), design the **Payment** screen of the client mobile app. This app only supports transfer payments raised by the client themselves (cash payments are recorded by staff in a different app) — so this screen is entirely about the QR transfer flow.

**Language:** all visible copy is neutral Spanish (Bolivia), informal "tú" address.

**Navigation chrome:** bottom tab bar present; a back arrow in the header returns to Plan Detail.

**Layout, top to bottom:**
1. Header: back arrow, title "Pago por transferencia".
2. The exact amount to pay, large and prominent (e.g. "Bs 250"), carried over from Plan Detail's total.
3. A QR code image area (placeholder QR graphic) representing the studio's bank QR.
4. Instruction text: "Escanea el código con tu app bancaria y transfiere el monto exacto."
5. An upload area: a dashed-border tap target labeled "Sube tu comprobante de transferencia", with a small icon, for attaching a screenshot of the transfer receipt.
6. A primary button "Enviar comprobante" (Palo de rosa fill), disabled until an image has been attached.

Show two frames: **before** attaching a screenshot (upload area empty, button disabled) and **after** (a thumbnail of the attached screenshot shown in the upload area, button enabled).

Generous whitespace, consistent with the rest of the app.
