# Follow-up — Add the no-results state to Clientes (Web Admin)

Targets: **AW21 (Clientes, Web Admin)**. Send as a follow-up.

---

AW21's own framing makes this the one state it can't do without: "las clientas no pertenecen a una sucursal, por eso el único filtro es la búsqueda". Search is the entire interface — the screen creates nothing and has no primary action — and it is drawn only full, with 9 of 148 rows and pagination. An Administrator typing a misspelt surname into a 148-client directory currently falls off the end of the design.

The staff app already answers this exact case on `S04`: "No se encontró ningún cliente. Revisa cómo lo escribiste o crea una ficha nueva." The admin web's own `AW25` and `AW31` both draw their empty ranges. AW21 is the gap.

Add a frame, **Escritorio · Sin resultados**, with the search field holding a query that matches nothing:

- The table card stays, header row intact, with the message centred in the body area — the columns don't vanish, so it reads as "this search found nothing", not as "this screen is broken".
- Copy: "No se encontró ninguna clienta." with a second, quieter line: "Revisa cómo escribiste el nombre o el teléfono."
- **No call to action.** Unlike `S04`, this screen cannot create a client — accounts are born in `S05` or by self-registration — so the second line must not offer to make one. Say where they come from instead if a third line helps: "Las cuentas se crean desde la app del personal o cuando la clienta se registra."
- The footer strip drops to "Mostrando 0 de 148 clientas" and the pagination controls render disabled, in the design system's disabled tone.

Add the matching **Navegador angosto · 420 px** note: the stacked-card list is replaced by the same message, the search field stays pinned above it.

Nothing else on AW21 changes — the four read-only columns, the absent primary action, the row-opens-`AW22` behaviour, and the populated default frames all stay as they are.
