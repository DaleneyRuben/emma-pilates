# Follow-up — The whole client app on v2

Targets: **every client screen** (`01`–`25`, except `17` Mi Crédito, which is
retired), exported as the 50 boards in `design/v2/cliente/`. Read with
[225](./225-visual-system-v2.md) and [226](./226-card-actions-as-text-buttons.md).
Send [30](./30-invariants-checklist.md) alongside this follow-up.

---

Written on 2026-11-02 (DES-003). The owner asked for every screen of the
client app to be redrawn on v2, one board per page, as a clickable prototype
in Claude Design. She approved the canvas the same day. From here on,
`design/v2/cliente/` is the source for the client app, and the v1 files for
the same screens stay only as history until the app code moves.

## What the boards carry

- The brand is «Emma Pilates Studio» everywhere. The tagline «Movimiento ·
  Equilibrio · Bienestar» is gone (owner, 2026-11-02).
- The walkthrough decisions
  ([review](../../../reviews/2026-11-02-hand-walkthrough.md)):
  - Inicio has the bell with its unread pill and the avatar; the Perfil tab
    has no pill.
  - The no-plan card reads «Elige tu plan y empieza a moverte».
  - Reservar shows the branch fixed when there is one, and its empty states
    have actions («Ver todas las clases», «Ver el jueves 5», «Ver mañana»).
  - Mis reservas has Próximas | Historial tabs (`07` becomes the Historial
    tab), card actions as text buttons, and the toast.
  - Elige tu plan has the launch banner, «Oferta por tiempo limitado · 15 %
    en tu plan», and «¡Quedan solo N lugares con 15 % de descuento!» from 10
    places down. «Fundadora» never shows.
  - Detalle del plan shows the discount in the breakdown. Prices are rounded
    to whole bolivianos (,50 rounds up).
  - Pago has the invoice as a collapsible «¿Necesitas factura?».
  - «Tu pago está en revisión» has the owner's copy, and the state screens
    are centred.
  - Invita a una amiga shows a readable code («LUCIA») with Copiar and «Cómo
    funciona» in three steps.
  - The end of Perfil has Preferencias and Cuenta sections, with «Cerrar
    sesión» as a row.
  - The permission sheet reads «No te pierdas ninguna clase».
- Mi plan offers **Renovación anticipada** («Renovar mi plan», with the new
  plan starting the day after the current one ends,
  `docs/decisiones-emma-pilates.md`). The first canvas said «Podrás comprar
  otro plan cuando este termine», and the owner flagged that as wrong.
- Pushed screens (with a back arrow) have no tab bar. Perfil is two boards
  (the top and the end).

## Left out on purpose

Mi plan about to expire, «Editar código» on the referral code (it waits for
BKM-017), the login's wrong-credentials and too-many-attempts errors, and the
pending email change. Each keeps its v1 frame until a later follow-up.
