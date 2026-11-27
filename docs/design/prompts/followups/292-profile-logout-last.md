# Follow-up — Perfil: «Cerrar sesión» last, alone, in the destructive colour

Targets: Client `design/v3/cliente/` C18, C18s, C18l; Staff `design/v3/equipo/` E-F01, E-F02, E-F03, E-F23, E-F24, E-F27, E-F04 and the new E-F28; the system in `design/v3/sistema/` (`tokens.json`, `Sistema Rosa Emma.html`).

Written and applied on 2026-11-27 on one Claude Design canvas. The owner tested the Client app 1.3.0 on an iPhone and found Perfil hard to read: the «Cuenta» card mixed «Cambiar contraseña», «Entrar con Face ID» and «Cerrar sesión», and «Ayuda y legal» came after the log-out row. Common guidance (Apple 5.1.1, Google Play's account-deletion guidance, and published UX research) puts log out last on the screen, on its own and styled as destructive, and keeps account deletion easy to find but quiet, always behind a confirmation. The owner approved the layout and, after comparing a pure red, a brick red and a palette-only option, chose the brick red («vamos con la opción ladrillo»).

## Client Perfil (C18, C18s)

1. «Cuenta» keeps only «Cambiar contraseña» and «Entrar con Face ID».
2. «Ayuda y legal» is unchanged.
3. Below it, with 24 px above it instead of the usual 12, a card of its own holds only «Cerrar sesión». The card is white (`#FFFBFB`), radius 20, has the usual card shadow and is at least 52 px tall. Inside it, centred, are the 20 px log-out icon and «Cerrar sesión» in Work Sans 16 weight 700, both in **Destructivo `#A04640`**.
4. Below that card, the footer is unchanged: «Emma Pilates Studio · versión … · Cerrar mi cuenta», with «Cerrar mi cuenta» as the small underlined link that opens C24.

## Confirmation (C18l, E-F04, E-F28)

The «¿Cerrar sesión?» sheet keeps its copy, layout and «Cancelar». Its confirm button «Cerrar sesión» is filled with Destructivo `#A04640` and has white `#FFFBFB` text. C18l is redrawn over the new bottom of the Client screen. E-F28 is new: the Instructor's profile scrolled to the bottom, behind the same sheet.

## Staff Perfil (E-F01, E-F02, E-F03; scrolled: E-F23, E-F24, E-F27)

The Staff profile follows the Client: «Cerrar sesión» leaves the «Ajustes» card, which now ends with «Cambiar contraseña». The same «Cerrar sesión» card sits last, after «Ayuda y legal». Staff has no version footer and no «Cerrar mi cuenta», so nothing follows the card.

## New colour role: Destructivo

| Role | Hex | Contrast |
|---|---|---|
| `destructivo` | `#A04640` | 5.93:1 on Superficie `#FFFBFB`, 6.10:1 on white, 5.71:1 on `#FEF6F2` |
| `sobre-destructivo` | `#FFFBFB` | 5.93:1 on `#A04640` |

This is the only hue outside the dusty-rose family. It is a muted brick that sits beside Rosa profundo, not an alert red. It is used only for actions that end something: «Cerrar sesión» and its confirmation. «Cerrar mi cuenta» stays a quiet Rosa profundo link, because C24 already asks for confirmation.

## Unchanged

Everything else on these screens stays as drawn, including the summary card, the other menu rows, the counts, the tab bars and the copy.
