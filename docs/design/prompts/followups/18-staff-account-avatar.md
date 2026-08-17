# Follow-up — El avatar de cuenta en las cuatro raíces de la app de staff

Targets: **S02 (Mi agenda · Entrenadora)**, **S04 (Buscar cliente · Asistente)**, **S11 (Pagos pendientes · Administración)**, **S15 (Mi agenda · Nutricionista)**. Send as a follow-up.

---

Prompt S23 (Perfil) dice que se llega "desde el avatar en la raíz de cada rol", y las notas de S02 ya prometían que "el avatar abre perfil y cierre de sesión". Ninguna de las cuatro raíces lo cumple:

- En **S02** y **S04** el avatar es decorativo: un `div` que no es botón, no tiene estado de pulsación y no lleva a ninguna parte. Además muestra **una sola letra** ("C", "J"), mientras que la app de cliente usa dos ("LM") y la web de administración también ("MF", AW33).
- En **S11** y **S15** **no hay avatar**: la esquina superior derecha la ocupa un botón de ícono de 46 px que lleva a un flujo secundario ("Cancelar una clase" → S13; "Mi disponibilidad" → S16).

La app de staff no tiene barra de pestañas en ningún rol, así que el avatar es el **único** camino hacia Perfil (S23), y por lo tanto el único camino hacia cambiar contraseña y cerrar sesión. Hoy administración y nutrición no tienen ninguno: quedan encerradas en su pantalla raíz sin poder salir de la sesión.

## 1. El avatar es un control, no un adorno

En las cuatro raíces, el avatar es un botón real:

- Círculo de 46 px, relleno `#D8BDB8`, iniciales en Lora blanco, **siempre dos letras** (las del nombre y el apellido).
- Área táctil mínima de 44 px y estado de pulsación (el mismo oscurecimiento suave que usan los demás controles de la app).
- Etiqueta accesible "Tu cuenta".
- Al tocarlo abre **Perfil (S23)**, del que se vuelve con la flecha de retorno a esta misma raíz. No abre una hoja ni un menú intermedio: el destino es la pantalla que ya existe.

Corrige las iniciales de una letra:

- **S02** — "C" → **"CR"**, Camila Rojas, el mismo nombre y correo que ya usa S23 para la entrenadora.
- **S04** — "J" → dos letras del nombre completo de la asistente. Fíjale un nombre y úsalo igual en todas las pantallas del rol (sugerencia: **Jimena Zabala**, "JZ"; cualquier nombre sirve mientras no choque con los de las clientas de ejemplo).

## 2. Dónde va el avatar cuando ya hay un ícono de acción

El lado derecho de la cabecera puede llevar dos controles, y **el avatar es siempre el último a la derecha**, en las cuatro raíces y en todos los frames. Así su posición no cambia de rol en rol.

- **S11** — a la derecha del título quedan, en este orden: el botón "Cancelar una clase" que ya está (cuadrado redondeado de 46 px, borde `#D8C9BB`, fondo blanco, ícono palo de rosa) y luego el avatar. Separación de 10 px.
- **S15** — igual, con el botón "Mi disponibilidad" seguido del avatar.

La diferencia de forma hace el trabajo de distinguirlos: **cuadrado redondeado con contorno = acción de la pantalla; círculo relleno con iniciales = tu cuenta.** No pongas el avatar dentro de un cuadrado ni le pongas borde.

Si el título ya no entra al lado de los dos controles —"Pagos pendientes" con su contador en el frame de Android es el caso ajustado— baja el título a 24 px o deja que ocupe dos líneas, pero **no** encojas los controles ni quites el contador de pagos por confirmar.

Aplica los dos controles en **todos los frames de cada pantalla**, incluidos los estados vacíos ("No hay pagos pendientes", "No tienes evaluaciones agendadas", "No tienes clases este día") y las versiones Android: es cuando no hay nada en la lista que más se nota si no hay salida.

En **S04**, el avatar es el único control de la derecha; "Nuevo cliente" sigue donde está, dentro del cuerpo, sin subir a la cabecera. En el frame de tablet, el avatar va arriba a la derecha del panel izquierdo, no sobre el panel de detalle.

## 3. Actualiza las notas de cada pantalla

Las notas al pie de S11 y S15 dicen hoy que el ícono de la cabecera es el único camino secundario del rol. Ahora son dos: el ícono de acción y el avatar, que abre Perfil (S23). La nota de S02 —"Sin navegación · el avatar abre perfil y cierre de sesión"— ya es correcta; déjala y añade la equivalente en S04, S11 y S15.

---

Nada más cambia. Las listas, tarjetas, selectores de fecha, contadores, estados vacíos y el destino de cada tarjeta se quedan igual; "Cancelar una clase" sigue llevando a S13 y "Mi disponibilidad" a S16; ninguna raíz gana barra de pestañas; Notificaciones (S20) sigue colgando de Perfil y no se sube a la cabecera; y Perfil (S23) no cambia en absoluto: esta corrección es solo sobre cómo se llega a él.
