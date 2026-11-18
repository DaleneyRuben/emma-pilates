# Follow-up — Walkthrough finding 91: the owner's choice

Targets: the same surfaces as [267](./267-contacts-in-clientas-proposals.md).
A decision record over the export in `design/v2/propuestas-contactos/`; no
board is regenerated. Send [30](./30-invariants-checklist.md) alongside.

---

Written on 2026-11-17 for DES-019 and FIX-065. The owner chose **A · Un
filtro más** («A», relayed by the walkthrough session).

## Clientas

Clientas › Todas is 267's option A, as `Selector.dc.html` (1440) and
`OpcionA420.dc.html` (420) draw it:

- **Cuenta cerrada** is the sixth chip, after Fundadora, drawn like the
  others. It lists only the former Clients who ticked «Quiero seguir
  recibiendo promociones» when they closed their account; a closed account
  never shows under Todas, Con plan, Sin plan, Expirado or Fundadora, and the
  subtitle's counts stay those of live Clients.
- With it chosen, one line under the chips says «Exclientas que cerraron su
  cuenta y pidieron seguir recibiendo promociones. No tienen ficha.», and the
  table's columns are **Nombre**, **Contacto** (email and phone, «—» without
  a phone), **Recibe promociones desde** (`dd/mm/aaaa`), **Estado** (the
  neutral «Cuenta cerrada» pill) and **Dejar de enviar** at the row's end.
  Rows open nothing. The range reads «Mostrando N de M exclientas».
- **Dejar de enviar** keeps AW35's confirmation and success line (267,
  «What every option keeps»).
- Empty: «Nadie cerró su cuenta pidiendo seguir recibiendo promociones.»;
  a search with no match: «No se encontró ninguna exclienta.»
- **Exportar CSV** is a neutral button in the title row, for every chip. It
  downloads at once what the chip and the search show (Nombre, Estado,
  Correo, Teléfono, Desde), named `clientas-<chip>-<aaaa-mm-dd>.csv`, and
  the page says «Descargamos clientas-con-plan-2026-11-17.csv con 3
  clientas.» It is disabled while the list is empty.
- At 420 the chips wrap onto two lines, as Clientas' chips already do, and
  the export sits under the title.
- The «Dejar de enviar» dialog keeps AW35's buttons as built: «Volver» and
  «Borrar contacto» (267 wrote «Cancelar»).

## Promociones

The «Contactos» tab and the «Contactos para promociones» button are gone.
The old address `/promociones/contactos` opens Clientas › Cuenta cerrada
with its search.

Options B and C are not built.
