# Invariants — settled facts no export may change

Targets: **every surface**. Send this **together with every future follow-up**, in the same message, in whichever conversation you're sending that follow-up to.

Unlike the other files here, this one is not a change request and it does not get marked "applied". It is a standing checklist. Re-send it unchanged, forever.

---

The last two exports applied what was asked and, in the same pass, undid earlier decisions that hadn't been mentioned: "Descuentos" came back to the sidebar, unlimited plans came back, and links that were the only entry point to a screen disappeared. These are not changes of mind: they are decisions already made that get lost between one export and the next.

**Before returning any export, go through this list and fix anything that doesn't hold, even if it has nothing to do with what you were asked in that message.** If something here looks wrong to you, say so instead of changing it.

## 1. Plans

- **No plan is unlimited.** Every plan sells a **fixed** number of classes. There is no "Mensual libre", "Mensual ilimitado", "Semestral libre", "Anual libre", "Ilimitadas" or any variant. If a plan shows up anywhere without a class count, it's wrong.
- The full catalogue, identical across `AW04`, `AW05`, `08`, `S09` and all sample data (`AW21`, `AW22`, `AW28`, `AW29`, `AW34`, `S11`, `S12`): **Paquete de 8 clases · Paquete de 12 clases · Mensual 16 clases (Bs 1.050) · Trimestral 36 clases · Semestral 90 clases (Bs 5.400) · Anual 180 clases (Bs 9.600)**. The client screens (`08`, `S09`) show the first four; the admin catalogue (`AW04`, `AW05`) shows all six.
- The possible durations are **1, 3, 6 or 12 months**. There are no 15-day passes and no other span.
- A plan's validity starts **when the payment is confirmed**, never "desde tu primera clase".
- What a client consumes is called a **clase**, not a "sesión". "Sesión" is the class scheduled in the studio's timetable.

## 2. Cancellation window

- It is **2 h 30**, everywhere (`Sistema de Diseño`, `05`, `09`, `S14`, `S21`). Never 6 hours.
- Outside the window **nothing is deducted**: the client can only reschedule to another class the same day.
- If the studio cancels a session, the class is refunded to **every** booking, including those already outside the window: the fault is the studio's.

## 3. Payments

- In the client app the **only** method is **bank transfer to the studio's QR**, attaching the receipt. The client app does not offer cash.
- **Cash is recorded by staff** in the staff app (`S10`), never by the client.

## 4. Waitlist

- `AW03` shows "N en lista de espera" next to the seat count, and the cancel-session copy — on `AW03` and on `S14` — says that people on the waitlist are notified too.
- `S03` (Entrenadora) does **not** show the waitlist: the trainer doesn't manage the queue.

## 5. Admin sidebar (`AW02`–`AW29`, `AW31`, `AW33`, `AW34`)

Identical on every screen, in this order:

- **Horario** (no section)
- **Catálogo**: Tipos de clase · Planes · Sucursales
- **Back Office**: Clientes · Pagos · Insumos · Evaluaciones nutricionales · Personal · Nómina · Gastos · Categorías de gasto
- **Promociones**: Promociones · Referidos · Créditos

**"Descuentos" does not exist** — it was removed by a recorded decision (ADR-0007) and nothing replaces it. If it reappears at any level, delete it.

## 6. Entry points that cannot disappear

Each of these is the **only** route to the screen it opens. If the link goes, the screen becomes unreachable:

| Link | From | To |
|---|---|---|
| "Ver reservas" | `S06` | `S21` |
| "ver todo" / "Ver historial completo" | `S06` | `S22` |
| "Ver historial de retiros" | `AW08` | `AW31` |
| "Cambiar contraseña" row | `18` | `23` |
| Account avatar | `S02`, `S04`, `S11`, `S15` | `S23` |
| Account avatar | `02` | `18` (Perfil tab) |
| Top bar user cell | any admin screen | `AW33` |
| Top bar branch cell | any admin screen | `AW34` |
| "¿Olvidaste tu contraseña?" | `01` / `S01` / `AW01` | `20` / `S18` / `AW30` |

`AW08` has **three** header actions: "+ Nuevo insumo" (primary), "Registrar retiro" (outlined) and "Ver historial de retiros" (text link).

## 7. Referrals and credit

- The referral reward is **money credit**, not a free class.
- Only the **referrer** earns it, not the new client.
- It is granted when the referred client's **first payment is confirmed**.
- On `01` (Registrarse con código) the code field carries **no helper text** about the reward. It was removed deliberately.

## 8. Notifications

- `19` (client) has **seven** types, including **rejected receipt** ("Tu comprobante fue rechazado: el monto no coincide con el plan. Sube uno nuevo para activar tu plan."), in red alongside cancelled class.
- `S20` (staff) has **five** types, including **session cancelled** for the Entrenadora.

## 9. Account avatar

- Filled `#D8BDB8` circle, **two letters** (first name and surname) in white Lora, label "Tu cuenta". Never a photo, never a border, never inside a square.
- It is **always the rightmost** element of the header. If there is an action icon, it sits to its left, 10px apart.
- It appears in **every frame** of the screen, including empty states and the Android and tablet versions.
- Shape tells them apart: outlined rounded square = screen action; filled circle with initials = your account.

## 10. Nutritional evaluations

- An evaluation records **the appointment** (client, nutritionist, time, kind), not its contents. **There is no detail screen** for an evaluation on any surface: not from `S15`, not from `AW25`.
- An evaluation **costs no money and consumes no classes**.

## 11. `design/README.md`

It is exported alongside the screens and must describe what the screens actually do. If a screen changes, that description changes with it — and conversely: never describe a link or a section that isn't drawn.
