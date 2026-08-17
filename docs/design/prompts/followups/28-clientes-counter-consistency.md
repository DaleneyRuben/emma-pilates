# Follow-up — One gender for the Clientes counters (Web Admin)

Targets: **AW21 (Clientes, Web Admin)**, **AW22 (Detalle de cliente, Web Admin)**. Send as a follow-up.

---

The "Sin resultados" state added by [follow-up 25](./25-admin-clients-no-results.md) writes its footer in the feminine while the rest of the screen writes it in the masculine, so `AW21` now contradicts itself inside the same component:

- Default frame: "Mostrando 9 de 148 **clientes**"
- No-results frames: "Mostrando 0 de 148 **clientas**"

The screen subtitle reads "148 **clientes** · 96 con plan activo", and `AW22` repeats that same subtitle. Meanwhile all of `AW21`'s prose — the empty message just added ("No se encontró ninguna **clienta**", "cuando la **clienta** se registra") and the notes ("Las **clientas** no pertenecen a una sucursal") — is feminine, as is `AW27`, which already counts in the feminine in both places: "Mostrando 9 de 9 **clientas** con crédito" and "9 **clientas** con crédito".

Align `AW21` and `AW22` with `AW27` and with the prose they already carry:

- `AW21`, default frame footer: "Mostrando 9 de 148 **clientas**".
- `AW21`, desktop subtitle: "148 **clientas** · 96 con plan activo". Same in the 420px frame's subtitle, "148 **clientas**".
- `AW22`, the same subtitle inherited from the listing: "148 **clientas** · 96 con plan activo".

**Do not touch the sidebar item or the route.** "Clientes" in the sidebar is the section label shared by `AW02`–`AW34`, and `admin.emmapilates.bo/back-office/clientes` is the URL; both stay exactly as they are. This change is only about the phrases that count people.

`AW22`'s title, "Detalle de cliente", also stays: it names the record type, not a counted group of people.

---

Nothing else changes on either screen: the four read-only columns, the absent primary action, search as the only filter, the pagination and its disabled states, the newly added no-results state, and `AW22`'s summary panel all stay as they are.
