# Follow-up — Restaurar correcciones que la última exportación revirtió

Targets: **Sistema de Diseño (Prompt 00)**, **08**, **18**, **19**, **S09**, **S11**, **S12**, **S14**, y **AW02–AW29**. Send as a follow-up in each surface's conversation, applying only the section for that surface.

---

La última exportación trajo bien el trabajo nuevo (`02`, `Sistema de Diseño`, `AW29`, `S12`, `S02`, `S04`, `S11`, `AW21`, `AW22`), pero **deshizo correcciones que ya estaban aplicadas y verificadas** en exportaciones anteriores. No es una decisión de diseño: son cambios que ya se habían pedido y que volvieron a su versión original.

Restaura cada uno exactamente como estaba. Nada de esto entra en conflicto con lo que se agregó ahora.

## Sistema de Diseño (Prompt 00)

La ventana de cancelación volvió a "6 horas". El plazo correcto es **2 h 30**, y la consecuencia también cambió. Deja la frase exactamente así:

> Puedes cancelar sin costo hasta 2 h 30 antes del inicio de la clase. Después de ese plazo solo puedes reprogramar a otra clase del mismo día.

No dice "se descuenta la sesión de tu paquete": fuera del plazo no se descuenta nada, se reprograma. Y el producto dice "clase", no "sesión", cuando habla de lo que consume una clienta.

## App de cliente — `08`, `18`, `19`

**`08` Elegir plan.** Volvió el catálogo viejo: "Clase suelta", "Paquete de 4 clases", "Mensual ilimitado". **Los planes ilimitados no existen** — todo plan vende una cantidad fija de clases. El catálogo correcto, el mismo que ya usan las demás pantallas, es:

- Paquete de 8 clases
- Paquete de 12 clases
- Mensual 16 clases
- Trimestral 36 clases

**`18` Perfil.** Desapareció la fila **"Cambiar contraseña"**, que va entre "Notificaciones" y "Cerrar sesión". Sin ella, la pantalla `23` (Cambiar contraseña) queda sin ninguna entrada en toda la app. Restáurala con el mismo estilo de fila que las de arriba.

**`19` Notificaciones.** Desapareció el tipo de notificación **comprobante rechazado**. Restaura la tarjeta:

> Tu comprobante fue rechazado: el monto no coincide con el plan. Sube uno nuevo para activar tu plan.

y la línea correspondiente de la leyenda de colores, que agrupa en rojo los dos resultados negativos: "**Rojo:** clase cancelada y comprobante rechazado; comparten color porque los dos comunican un resultado negativo."

## App de staff — `S09`, `S11`, `S12`, `S14`

**`S09`, `S11`, `S12`.** Volvió "Mensual ilimitado" como plan de ejemplo. Reemplázalo por uno del catálogo real (arriba). En `S11` aparece además dentro de los datos de ejemplo de la bandeja de pagos, junto al monto: usa un plan y un monto que se correspondan.

**`S14` Cancelar sesión.** Dos cosas volvieron atrás:

1. La nota "Reembolso garantizado" dice "fuera del plazo de 6 h". Es **2 h 30**: "Se devuelve la clase a todas las reservas, incluso fuera del plazo de 2 h 30: la falta es del estudio."
2. Del aviso de advertencia se cayó la última frase, la que cubre la lista de espera. El párrafo completo es:

> Se cancelarán las 10 reservas de esta clase, se reembolsará una clase a cada cliente afectado — incluso si ya no podían cancelar por su cuenta — y se les notificará. **También se notificará a las 2 en lista de espera.**

Cancelar una sesión libera también a quien esperaba un cupo, y el administrador tiene que saberlo antes de confirmar.

**`S11`, además — termina el avatar de cuenta.** El avatar "Tu cuenta" quedó solo en el primer frame. Falta en el frame de **Android · Bandeja de pagos** y en el de **iOS · Sin pagos pendientes**, con el botón "Cancelar una clase" a su izquierda y 10 px de separación, igual que en el frame que sí lo tiene. El estado vacío es justamente donde más se nota que no hay salida de la pantalla.

## Web de administración — `AW02` a `AW29`

La barra lateral volvió a una versión anterior: reapareció la sección **"Descuentos"** y desaparecieron **Insumos**, **Nómina**, **Gastos** y **Categorías de gasto** de Back Office. "Descuentos" no existe en el producto. La barra correcta, idéntica en las 28 pantallas, es:

- **Horario** (sin sección)
- **Catálogo**: Tipos de clase · Planes · Sucursales
- **Back Office**: Clientes · Pagos · Insumos · Personal · Nómina · Gastos · Categorías de gasto
- **Promociones**: Promociones · Referidos · Créditos

Sin "Descuentos" en ningún nivel. `AW21` ya quedó bien en esta exportación — úsala como referencia.

---

Nada del trabajo nuevo se toca: el avatar de cuenta en `02`, `S02`, `S04` y `S15`, la sección "Avatar de cuenta" del `Sistema de Diseño`, el comprobante ampliado de `AW29` y `S12`, los contadores en femenino de `AW21`/`AW22`, el selector de sucursal `AW34`, y los estados de `05`, `15` y `S15` se quedan exactamente como están.
