# Follow-up — El avatar de cuenta en las tres raíces que faltan (app de staff)

Targets: **S02 (Mi agenda · Entrenadora)**, **S04 (Buscar cliente · Asistente)**, **S11 (Pagos pendientes · Administración)**. Send as a follow-up.

Replaces the unapplied part of [follow-up 18](./18-staff-account-avatar.md), which only landed on `S15`. Do not re-send 18 — it still asks for the change on `S15`, where it is already done.

---

`S15` now does this correctly and is the reference: la cabecera lleva el ícono de acción de la pantalla y, **siempre el último a la derecha**, un avatar circular que abre Perfil (`S23`). Copy that header exactly into the three roots that still don't have it.

Hoy:

- **S02** y **S04** dibujan el avatar como un `div` decorativo — no es botón, no tiene estado de pulsación y no lleva a ninguna parte. Además muestra **una sola letra** ("C", "J"), mientras el resto del producto usa dos (`02` usa "LM", `AW33` usa "MF", `S15` usa dos).
- **S11** no tiene avatar: la esquina superior derecha la ocupa el botón "Cancelar una clase" (→ `S13`) y nada más.

La app de staff no tiene barra de pestañas en ningún rol, así que el avatar es el **único** camino hacia `S23`, y por lo tanto el único camino hacia cambiar contraseña y cerrar sesión. Entrenadora, Recepción y Administración hoy no tienen ninguno: quedan encerradas en su pantalla raíz sin poder salir de la sesión.

## 1. El avatar es un control, no un adorno

En las tres pantallas, igual que en `S15`:

- Círculo de 46 px, relleno `#D8BDB8`, iniciales en Lora blanco, **dos letras** — las del nombre y el apellido de quien tiene la sesión iniciada. Si la pantalla hoy solo trae un nombre de pila, usa el apellido que ya le da `S23` a ese rol; si el rol no aparece en `S23`, elige uno y úsalo igual en todas las pantallas de ese rol.
- Área táctil mínima de 44 px y estado de pulsación (el mismo oscurecimiento suave de `S15`).
- Etiqueta accesible "Tu cuenta".
- Al tocarlo abre **Perfil (`S23`)**, del que se vuelve con la flecha de retorno a esta misma raíz. No abre una hoja ni un menú intermedio.

## 2. Dónde va cuando ya hay un ícono de acción

El lado derecho de la cabecera puede llevar dos controles y **el avatar es siempre el último a la derecha**, para que su posición no cambie de rol en rol. Separación de 10 px, como en `S15`.

- **S11** — primero el botón "Cancelar una clase" que ya está (cuadrado redondeado de 46 px, borde `#D8C9BB`, fondo blanco, ícono palo de rosa), luego el avatar.
- **S02** y **S04** — el avatar es el único control de la derecha; se queda donde está y solo pasa a ser botón.

La diferencia de forma distingue los dos: **cuadrado redondeado con contorno = acción de la pantalla; círculo relleno con iniciales = tu cuenta.** No pongas el avatar dentro de un cuadrado ni le pongas borde.

Si el título ya no entra al lado de los dos controles —"Pagos pendientes" con su contador en el frame de Android es el caso ajustado— baja el título a 24 px o deja que ocupe dos líneas, pero **no** encojas los controles ni quites el contador de pagos por confirmar.

Aplica el cambio en **todos los frames de cada pantalla**, incluidos los estados vacíos ("Día sin clases", "Sin resultados", "Sin pagos pendientes") y las versiones Android y tablet: es cuando no hay nada en la lista que más se nota si no hay salida. En el frame de tablet de `S04`, el avatar va arriba a la derecha del panel izquierdo, no sobre el panel de detalle.

## 3. Actualiza las notas de cada pantalla

La nota de `S11` dice hoy que el ícono de la cabecera es el único camino secundario del rol. Ahora son dos: el ícono de acción y el avatar, que abre `S23`. Añade la nota equivalente en `S02` y `S04`, con la misma redacción que ya usa `S15`.

---

Nada más cambia. Las listas, tarjetas, buscador por teléfono, selector de fecha, contadores, estados vacíos y el destino de cada fila se quedan igual; "Cancelar una clase" sigue llevando a `S13`, "Nuevo cliente" sigue dentro del cuerpo de `S04` sin subir a la cabecera, ninguna raíz gana barra de pestañas, Notificaciones (`S20`) sigue colgando de Perfil, y `S23` no cambia en absoluto: esta corrección es solo sobre cómo se llega a él.
