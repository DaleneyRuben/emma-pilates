# Follow-up — Documenta el avatar de cuenta en "06 Navegación"

Targets: **Sistema de Diseño (Prompt 00)**, sección "06 Navegación". Send as a follow-up.

---

La sección describe el patrón de navegación de cada aplicación —barra de pestañas en cliente, cabecera en staff, barra lateral en el panel web— pero no menciona el único control que aparece en las tres: **el avatar de cuenta**. Sin él documentado, cada pantalla lo resolvió distinto (una letra en staff, dos en cliente y en la web; decorativo en unas raíces, ausente en otras). Añade un bloque corto al final de la sección, con el mismo tono descriptivo del resto:

**Avatar de cuenta.** Círculo relleno `#D8BDB8` de 46 px en móvil y 28 px en la web, con las **dos** iniciales del nombre y apellido en Lora. Nunca lleva foto en la app de staff ni en el panel web. Es el acceso a la propia cuenta —perfil, cambiar contraseña y cerrar sesión— y ocupa siempre el extremo derecho de la cabecera:

- **App de cliente** — en Inicio (`02`), como atajo a la pestaña Perfil (`18`), que además siempre está en la barra de pestañas.
- **App de staff** — en las cuatro raíces de rol (`S02`, `S04`, `S11`, `S15`) y único camino a Perfil (`S23`), porque ningún rol tiene barra de pestañas.
- **Panel web** — dentro de la celda de usuario de la barra superior, que abre el menú de AW33.

Cuando una pantalla también tiene un ícono de acción arriba a la derecha, el ícono va **a la izquierda** del avatar y se dibuja como cuadrado redondeado con contorno `#D8C9BB` sobre blanco. La forma distingue las dos cosas: **cuadrado con contorno = acción de la pantalla; círculo relleno con iniciales = tu cuenta.**

Dibuja el ejemplo con las dos variantes juntas —cabecera de rol con solo avatar y cabecera de rol con ícono de acción + avatar— al lado de los ejemplos de navegación que ya están.

---

Nada más de esta sección cambia: la barra de pestañas de cliente con sus cuatro etiquetas, la cabecera de staff con flecha de retorno y sus cuatro roles, y la barra lateral de 236 px del panel web se quedan como están. El resto del archivo —paleta, escala tipográfica, espaciado, radios, elevación, píldoras de estado, botones y reglas de escritura— tampoco se toca.
