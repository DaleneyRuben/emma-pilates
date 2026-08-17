# Follow-up — Un solo género en los contadores de Clientes (Web Admin)

Targets: **AW21 (Clientes, Web Admin)**, **AW22 (Detalle de cliente, Web Admin)**. Send as a follow-up.

---

El estado "Sin resultados" que agregó [follow-up 25](./25-admin-clients-no-results.md) escribe el pie en femenino y el resto de la pantalla lo escribe en masculino, así que `AW21` ahora se contradice consigo misma dentro del mismo componente:

- Frame por defecto: "Mostrando 9 de 148 **clientes**"
- Frames sin resultados: "Mostrando 0 de 148 **clientas**"

El subtítulo de la pantalla dice "148 **clientes** · 96 con plan activo", y `AW22` repite ese mismo subtítulo. En cambio toda la prosa de `AW21` —el mensaje de vacío que acabamos de agregar ("No se encontró ninguna **clienta**", "cuando la **clienta** se registra") y las notas ("Las **clientas** no pertenecen a una sucursal")— va en femenino, igual que `AW27`, que ya cuenta en femenino en los dos lugares: "Mostrando 9 de 9 **clientas** con crédito" y "9 **clientas** con crédito".

Alinea `AW21` y `AW22` con `AW27` y con la prosa que ya tienen:

- `AW21`, pie del frame por defecto: "Mostrando 9 de 148 **clientas**".
- `AW21`, subtítulo de escritorio: "148 **clientas** · 96 con plan activo". Lo mismo en el subtítulo del frame de 420 px, "148 **clientas**".
- `AW22`, el mismo subtítulo heredado del listado: "148 **clientas** · 96 con plan activo".

**No toques el ítem del menú lateral ni la ruta.** "Clientes" en la barra lateral es la etiqueta de sección que comparten `AW02`–`AW34` y `admin.emmapilates.bo/back-office/clientes` es la URL; ambos se quedan exactamente como están. Este cambio es solo sobre las frases que cuentan personas.

El título de `AW22`, "Detalle de cliente", también se queda: nombra el tipo de registro, no a un grupo de personas contadas.

---

Nada más cambia en ninguna de las dos pantallas: las cuatro columnas de solo lectura, la ausencia de acción primaria, la búsqueda como único filtro, la paginación y sus estados deshabilitados, el estado sin resultados recién agregado, y el panel de resumen de `AW22` se quedan igual.
