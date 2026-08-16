# Follow-up — Add "Cambiar contraseña" to the client's Perfil

Targets: **18 (Perfil)**. Send as a follow-up.

---

Prompt S05 tells the Assistant to hand a client a temporary password with the line "Compártela con la clienta; podrá cambiarla **desde su perfil** al entrar" — but Perfil has no such row, and the client app has no signed-in way to change a password at all. (`20` is the recover flow before a session exists; `21` is the forced first-login step.)

In the existing menu group — the one holding "Mi plan", "Mis evaluaciones", "Mis referidos", "Mi crédito", "Notificaciones" — add a **"Cambiar contraseña"** row between "Notificaciones" and the "Cerrar sesión" button. Same 60px row, same line icon in palo de rosa, same chevron, no value on the right. It opens the new Cambiar contraseña screen (Prompt 23).

Nothing else on this screen changes — the summary card, the two rows that carry a value on the right (plan status and credit balance), the "Cerrar sesión" outline button and the "Términos y privacidad" footer all stay as they are.
