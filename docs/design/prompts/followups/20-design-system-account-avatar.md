# Follow-up — Document the account avatar in "06 Navegación"

Targets: **Sistema de Diseño (Prompt 00)**, section "06 Navegación". Send as a follow-up.

---

The section describes each app's navigation pattern — tab bar on client, header on staff, sidebar on the web panel — but never mentions the one control that appears in all three: **the account avatar**. With it undocumented, every screen solved it differently (one initial on staff, two on client and web; decorative on some roots, absent on others).

Add a short block at the end of the section, in the same descriptive tone as the rest. The block's copy, like everything in this file, is in Spanish:

> **Avatar de cuenta.** Círculo relleno `#D8BDB8` de 46 px en móvil y 28 px en la web, con las **dos** iniciales del nombre y apellido en Lora. Nunca lleva foto en la app de staff ni en el panel web. Es el acceso a la propia cuenta —perfil, cambiar contraseña y cerrar sesión— y ocupa siempre el extremo derecho de la cabecera:
>
> - **App de cliente** — en Inicio (`02`), como atajo a la pestaña Perfil (`18`), que además siempre está en la barra de pestañas.
> - **App de staff** — en las cuatro raíces de rol (`S02`, `S04`, `S11`, `S15`) y único camino a Perfil (`S23`), porque ningún rol tiene barra de pestañas.
> - **Panel web** — dentro de la celda de usuario de la barra superior, que abre el menú de AW33.
>
> Cuando una pantalla también tiene un ícono de acción arriba a la derecha, el ícono va **a la izquierda** del avatar y se dibuja como cuadrado redondeado con contorno `#D8C9BB` sobre blanco. La forma distingue las dos cosas: **cuadrado con contorno = acción de la pantalla; círculo relleno con iniciales = tu cuenta.**

Draw the example with both variants side by side — a role header with only an avatar, and a role header with action icon + avatar — next to the navigation examples already there.

---

Nothing else in this section changes: the client tab bar with its four labels, the staff header with its back arrow and four roles, and the web panel's 236px sidebar stay as they are. The rest of the file — palette, type scale, spacing, radii, elevation, status pills, buttons and writing rules — is untouched too.
