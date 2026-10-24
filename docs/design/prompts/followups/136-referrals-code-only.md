# Follow-up — Mis referidos shows only the code; Mi crédito is retired

Targets: **16 (Mis referidos)**, **17 (Mi crédito)**, **18 (Perfil)**,
**02 (Inicio)**, and the **generated handoff `design/README.md`** (the `02`,
`16`, `17`, and `18` inventory rows). Send
[30](./30-invariants-checklist.md) alongside this follow-up.

---

Written by PAY-005 on 2026-10-23. The owner removed the Bs 60 referral
Credit (decisions document §5.3, booking
[ADR-0009](../../../../booking/docs/adr/0009-invite-a-friend-replaces-referral-credit.md)).
Every Client keeps her referral code, because the coming «Invita a una
amiga» (BKM-014) and the registration codes (BKM-011) use it. Until BKM-014
ships, `16` shows the code and a promise, nothing about money or about the
friends who registered.

## 1. `16` — the code and a promise

Both frames keep the top bar «Mis referidos» and the code card exactly as
drawn (the «Tu código» label, the code in Lora, «Compartir»). Below the code
card:

- The explanation line becomes **«Pronto podrás invitar a una amiga a una
  clase gratis.»** (15px, `#766D69`, centred), the same style as the old
  explanation.
- Remove the **«Tu crédito»** row (label, amount, and chevron).
- Remove **«Tus invitaciones»** and its rows («Crédito ganado», «Esperando su
  primer pago»), and the empty line «Aún no has invitado a nadie…».

So the two frames become one: keep the first frame, captioned **«Tu código»**,
and delete the second («Estados de espera y crédito ganado»). The notes card
keeps only: «**Código** · El código es el protagonista; «Compartir» abre la
hoja del sistema con un mensaje que lo incluye. La invitación de una amiga a
una clase gratis llega con «Invita a una amiga» (BKM-014).» Delete the
ámbar and verde state notes.

## 2. `17` — retired

`17` (Mi crédito) is no longer reached from anywhere. Keep the file as
history, but add a single banner across its first frame: **«Pantalla
retirada (PAY-005): el crédito por referidos ya no existe.»** (13px,
`#766D69`, on `#FAF7F2`, 12px radius, 12px 16px padding), and nothing else
changes.

## 3. `18` — no «Mi crédito» row

Remove the **«Mi crédito»** row (icon, label, amount, chevron) from both
frames. «Mis referidos» stays where it is and the rows below it move up.

## 4. `02` — the referral shortcut

The «Mis referidos» shortcut's summary «Invita amigas y gana crédito» becomes
**«Comparte tu código»**. Nothing else on `02` changes.

## 5. Handoff README

- `16`: «Mis referidos: the referral code with Compartir and the line
  «Pronto podrás invitar a una amiga a una clase gratis.» (PAY-005)».
- `17`: «Mi crédito: retired by PAY-005; not reachable».
- `18`: drop «Mi crédito» from the row list.
- `02`: the shortcut summary is «Comparte tu código».

## Leave untouched

The code card's look, «Compartir», the other `18` rows and the «Cerrar mi
cuenta» link, and every other `02` card.
