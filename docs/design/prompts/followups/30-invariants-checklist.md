# Invariantes — hechos ya decididos que ninguna exportación debe cambiar

Targets: **todas las superficies**. Send this **together with every future follow-up**, in the same message, in whichever conversation you're sending that follow-up to.

Unlike the other files here, this one is not a change request and it does not get marked "applied". It is a standing checklist. Re-send it unchanged, forever.

---

Las últimas dos exportaciones aplicaron bien lo que se pidió y, en la misma pasada, deshicieron decisiones anteriores que no se habían mencionado: volvió "Descuentos" a la barra lateral, volvieron los planes ilimitados, desaparecieron enlaces que eran la única entrada a una pantalla. No son cambios de criterio: son decisiones ya tomadas que se pierden entre una exportación y la siguiente.

**Antes de devolver cualquier exportación, revisa esta lista y corrige lo que no se cumpla, aunque no tenga nada que ver con lo que se te pidió en ese mensaje.** Si algo de acá te parece equivocado, dilo en vez de cambiarlo.

## 1. Planes

- **Ningún plan es ilimitado.** Todo plan vende una cantidad **fija** de clases. No existe "Mensual libre", "Mensual ilimitado", "Semestral libre", "Anual libre", "Ilimitadas" ni ninguna variante. Si en algún lado aparece un plan sin número de clases, está mal.
- El catálogo completo, idéntico en `AW04`, `AW05`, `08`, `S09` y en todo dato de ejemplo (`AW21`, `AW22`, `AW28`, `AW29`, `AW34`, `S11`, `S12`): **Paquete de 8 clases · Paquete de 12 clases · Mensual 16 clases (Bs 1.050) · Trimestral 36 clases · Semestral 90 clases (Bs 5.400) · Anual 180 clases (Bs 9.600)**. Las pantallas de cliente (`08`, `S09`) muestran los cuatro primeros; el catálogo de administración (`AW04`, `AW05`) muestra los seis.
- Las duraciones posibles son **1, 3, 6 o 12 meses**. No hay pases de 15 días ni ningún otro plazo.
- La vigencia de un plan empieza **cuando se confirma el pago**, nunca "desde tu primera clase".
- Lo que consume una clienta se llama **clase**, no "sesión". "Sesión" es la clase programada en el horario del estudio.

## 2. Ventana de cancelación

- Son **2 h 30**, en todas partes (`Sistema de Diseño`, `05`, `09`, `S14`, `S21`). Nunca 6 horas.
- Fuera del plazo **no se descuenta nada**: solo se puede reprogramar a otra clase del mismo día.
- Si el estudio cancela una sesión, se reembolsa la clase a **todas** las reservas, incluso a las que ya estaban fuera del plazo: la falta es del estudio.

## 3. Pagos

- En la app de cliente el **único** método es **transferencia al QR del estudio**, adjuntando el comprobante. La app de cliente no ofrece efectivo.
- El **efectivo lo registra el equipo** en la app de staff (`S10`), nunca la clienta.

## 4. Lista de espera

- `AW03` muestra "N en lista de espera" junto al conteo de lugares, y el texto de cancelar sesión —en `AW03` y en `S14`— dice que también se avisa a quienes están en la lista de espera.
- `S03` (Entrenadora) **no** muestra la lista de espera: la entrenadora no maneja la cola.

## 5. Barra lateral del admin (`AW02`–`AW29`, `AW31`, `AW33`, `AW34`)

Idéntica en todas las pantallas, en este orden:

- **Horario** (sin sección)
- **Catálogo**: Tipos de clase · Planes · Sucursales
- **Back Office**: Clientes · Pagos · Insumos · Evaluaciones nutricionales · Personal · Nómina · Gastos · Categorías de gasto
- **Promociones**: Promociones · Referidos · Créditos

**"Descuentos" no existe** — se eliminó por decisión registrada (ADR-0007) y no lo reemplaza nada. Si reaparece en cualquier nivel, bórralo.

## 6. Entradas que no pueden desaparecer

Cada una de estas es el **único** camino a la pantalla que abre. Si se cae el enlace, la pantalla queda inalcanzable:

| Enlace | Desde | Hacia |
|---|---|---|
| "Ver reservas" | `S06` | `S21` |
| "ver todo" / "Ver historial completo" | `S06` | `S22` |
| "Ver historial de retiros" | `AW08` | `AW31` |
| Fila "Cambiar contraseña" | `18` | `23` |
| Avatar de cuenta | `S02`, `S04`, `S11`, `S15` | `S23` |
| Avatar de cuenta | `02` | `18` (pestaña Perfil) |
| Celda de usuario de la barra superior | cualquier pantalla admin | `AW33` |
| Celda de sucursal de la barra superior | cualquier pantalla admin | `AW34` |
| "¿Olvidaste tu contraseña?" | `01` / `S01` / `AW01` | `20` / `S18` / `AW30` |

`AW08` tiene **tres** acciones en el encabezado: "+ Nuevo insumo" (principal), "Registrar retiro" (delineada) y "Ver historial de retiros" (enlace de texto).

## 7. Referidos y crédito

- La recompensa por referir es **crédito en dinero**, no una clase de regalo.
- La gana **solo quien refiere**, no la clienta nueva.
- Se otorga cuando se **confirma el primer pago** de la clienta referida.
- En `01` (Registrarse con código) el campo de código **no lleva texto de ayuda** sobre la recompensa. Se quitó a propósito.

## 8. Notificaciones

- `19` (cliente) tiene **siete** tipos, incluido **comprobante rechazado** ("Tu comprobante fue rechazado: el monto no coincide con el plan. Sube uno nuevo para activar tu plan."), en rojo junto a clase cancelada.
- `S20` (staff) tiene **cinco** tipos, incluido **sesión cancelada** para la Entrenadora.

## 9. Avatar de cuenta

- Círculo relleno `#D8BDB8`, **dos letras** (nombre y apellido) en Lora blanco, etiqueta "Tu cuenta". Nunca lleva foto, nunca lleva borde, nunca va dentro de un cuadrado.
- Va **siempre el último a la derecha** de la cabecera. Si hay un ícono de acción, va a su izquierda con 10 px de separación.
- Aparece en **todos los frames** de la pantalla, incluidos los estados vacíos y las versiones Android y tablet.
- La forma distingue: cuadrado redondeado con contorno = acción de la pantalla; círculo relleno con iniciales = tu cuenta.

## 10. Evaluaciones nutricionales

- Una evaluación registra **la cita** (clienta, nutricionista, hora, tipo), no su contenido. **No existe pantalla de detalle** de una evaluación en ninguna superficie: ni desde `S15`, ni desde `AW25`.
- Una evaluación **no cuesta dinero ni descuenta clases**.

## 11. `design/README.md`

Se exporta junto con las pantallas y debe describir lo que las pantallas realmente hacen. Si una pantalla cambia, esa descripción cambia con ella — y al revés: nunca describas un enlace o una sección que no esté dibujada.
