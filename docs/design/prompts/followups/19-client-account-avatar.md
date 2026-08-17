# Follow-up — El avatar de Inicio abre Perfil

Targets: **02 (Inicio)**. Send as a follow-up.

---

El avatar "LM" junto al saludo es un `div` decorativo: no es botón, no tiene estado de pulsación y no lleva a ninguna parte. En la app de staff el mismo elemento abre Perfil, y en la web de administración la celda de usuario abre su menú (AW33). Aquí no hace nada, y una clienta que lo toca esperando su cuenta no obtiene respuesta.

Conviértelo en un control real:

- Mismo círculo de 46 px, relleno `#D8BDB8`, iniciales en Lora blanco, dos letras ("LM"). No cambia de tamaño, color ni posición: sigue alineado con el saludo, arriba a la derecha.
- Botón con área táctil mínima de 44 px, estado de pulsación y etiqueta accesible "Tu cuenta".
- Al tocarlo abre **Perfil (pantalla 18)**, la raíz de la pestaña Perfil, con la pestaña "Perfil" marcada como activa en la barra inferior. Es un atajo a un destino que ya existe: no abre una hoja ni un menú, y no crea una pantalla nueva.

Añade la nota correspondiente al pie de la pantalla: el avatar es un atajo a Perfil; la barra de pestañas sigue siendo el camino principal.

El avatar se queda **solo en Inicio**. Las otras raíces de pestaña (Reservar, Mis reservas) no lo llevan: en la app de cliente la barra de pestañas acompaña a todas las pantallas y ya ofrece Perfil en todo momento, así que repetir el avatar sería un segundo camino al mismo sitio en la misma pantalla. En la app de staff, que no tiene barra de pestañas, el avatar sí va en las cuatro raíces (ver el follow-up de S02/S04/S11/S15).

---

Nada más cambia en esta pantalla: el saludo y la fecha, el carrusel de novedades, la tarjeta de plan con su progreso y su enlace "Ver detalle", los accesos rápidos y la barra de pestañas de cuatro destinos se quedan exactamente como están, en todos los frames.
