# Follow-up — The Coordinator's stack in the Staff app

Targets: **S04 (Buscar cliente)**, **S06 (Resumen del cliente)**, **S23 (Perfil)**, **S24 (Ver la app como…)**, and the
**generated handoff `design/README.md`** (the staff navigation bullets and
the S04, S06, S23, S24 rows). Send [30](./30-invariants-checklist.md)
alongside this follow-up.

---

Written by IDN-009 on 2026-10-23
([ADR-0102](../../../adr/0102-coordinator-role-without-money.md)). The
Coordinator has her own stack in the Staff app. She searches Clients and
manages their Bookings like the Assistant (S04, S06, S07, S08, S21, S22, at
every Branch), never sells and never registers a new Client (owner,
2026-10-23), and cancels a Session with Bookings like the Administrator (S13,
S14). No amount appears on her screens.

## 1. `S04` — her root

A new frame **«iOS · Coordinadora»** copying the first iOS frame: the header
keeps the search and the avatar «CR», but the **«Nuevo cliente»** action is
absent; in its place, under the search field, a full-width outline button
**«Cancelar una clase»** (the style of S11's entry to S13) that opens S13.

## 2. `S06` — no sale, no Credit

A new frame **«iOS · Coordinadora»** copying «Teléfono · Suscripción
activa»: «Registrar pago en efectivo» and its note are absent, and so is the
Crédito line; «Reservar clase», «Ver reservas», and the history card stay.
For a Client without an active Plan the frame shows the note «La clienta
necesita un plan activo para reservar.» where the cash action was.

## 3. `S13` — reached from her root

S13 does not change: its back arrow returns to S04 in her stack, as it
returns to S11 in the Administrator's. S14 is unchanged.

## 4. `S23` — the Role line

In the Perfil frames, her Role line reads **«Coordinación»** (the
Administrator's reads «Administración») and her Branches line «Todas las
sucursales».

## 5. `S24` — she can be seen as

The list of Staff Members gains Carolina Rivas with the Role «Coordinación».
The banner reads «Viendo como Carolina Rivas» over «Coordinación · Quedan 30
min».

## 6. README

Add to the staff navigation bullets: «The Coordinator (ADR-0102) lands on S04
without «Nuevo cliente» and with «Cancelar una clase» (S13/S14); S06 has no cash
sale and no Crédito line for her; she acts at every Branch. Her follow-up
contact list arrives with BKM-013.»

## What must remain untouched

Every Assistant and Administrator frame, S05, S09, S10, S11, and S12, and the
seat-pill and capacity rules.
