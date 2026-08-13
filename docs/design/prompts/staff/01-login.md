# Prompt S01 — Login

Staff app. Entry screen, shared by all three Roles (Trainer, Assistant, Administrator) — references Prompt 00 (design system) only.

After authenticating, the app routes to the home screen matching the logged-in Staff Member's Role — there is no role picker, since each Staff Member has exactly one Role: Trainer → Schedule (Prompt S02), Assistant → Client Search (Prompt S04), Administrator → Pending Payments (Prompt S11). The Nutritionist role has no screens in this app (they publish Availability and hold Evaluations, handled elsewhere).

---

Using the Emma Pilates Studio design system established in Prompt 00, design the **Login** screen for the staff app — the single app used by Trainers, Assistants, and Administrators.

Staff Member accounts are created by an Administrator, never self-registered — so there is **no Sign Up mode**, a single login form only.

**Language:** all visible copy is neutral Spanish (Bolivia), informal "tú" address.

This is the entry point before any authenticated content — no navigation chrome.

**Layout:**
- Brand header: "Emma" wordmark and "Movimiento · Equilibrio · Bienestar" tagline, centered, generous top whitespace.
- Field: "Correo electrónico o teléfono"
- Field: "Contraseña"
- Primary button: "Iniciar sesión" (Palo de rosa fill)
- Below the button, a secondary biometric quick-login row: "Iniciar sesión con Face ID" with a Face ID icon on iOS, "Iniciar sesión con huella digital" with a fingerprint icon on Android — show both as separate platform variants of this screen
- Text link: "¿Olvidaste tu contraseña?"

Keep the form vertically centered with generous whitespace above and below.
