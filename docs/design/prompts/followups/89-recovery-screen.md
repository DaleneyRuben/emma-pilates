# Follow-up — The recovery screen («Algo salió mal») for the Client and Staff apps

Targets: **Sistema de Diseño (Prompt 00)** (one new card, «Pantalla de
recuperación», next to the empty states); **generated handoff
`design/README.md`** (a «Recovery screen (Client and Staff)» section after
«Lists between rules (Client and Staff)»). No numbered screen changes. Send
[30](./30-invariants-checklist.md) alongside this follow-up.

---

Written by MOB-053 on 2026-10-08. Neither app has a screen for a failure of
the app itself. Every data screen already answers a failed request with a
centred line («No pudimos cargar tu inicio.», «No pudimos cargar la lista de
asistencia.») and a «Reintentar» primary button, but a defect that throws while
a screen renders (the conditional hook MOB-051 fixed is the kind) has nothing
to land on: in Expo Go the red box covers the app and in a release build the
app closes. MOB-053 adds an error boundary that catches that throw and shows a
recovery screen in its place, in both apps, on any screen. No prompt draws
such a state, so this follow-up proposes it; the apps are built from the copy
below, and the export is a design-accuracy change only.

## 1. The state

The recovery screen replaces only the screen that failed. The tab bar of the
Client app, the Staff Role's stack, and every other screen stay where they
were; «Reintentar» draws the failed screen again from scratch (its requests
run again). When the failure is above every screen (the Login flow, the
providers), the same screen fills the whole viewport and «Reintentar»
restarts the app's tree.

It is the plain empty state of `07`, `19`, `S20`, `S21`, and `S22` (README
«Lists between rules», last bullet) with an action, on Superficie, centred
vertically and horizontally in the safe area, with no card, no box, and no
icon (no line icon in the set means «error», and a decorative one would
compete with the title):

- **Title:** «Algo salió mal», Lora 21 weight 500 `#4A4A4A`, centred.
- **Note:** «No pudimos mostrar esta pantalla. Inténtalo de nuevo; si vuelve
  a pasar, cierra la app y ábrela otra vez.», Work Sans 14/22 `#766D69`,
  centred, up to 260 px wide, 16 px under the title.
- **Action:** «Reintentar», the regular 52 px primary button (Palo de rosa
  `#B78380`, white label), at least 220 px wide, 10 px under the note.

The copy follows the apps' tone («No pudimos guardar los cambios. Inténtalo
de nuevo.»): tú, no apology, no technical detail, no error code. Nothing
else is shown: no «Volver» (the tab bar or the device's back gesture still
work), no «Reportar», no second line about what went wrong.

## 2. Sistema de Diseño — «Pantalla de recuperación»

Add one card next to the empty-state samples, titled «Pantalla de
recuperación», drawing the state of §1 inside a phone frame at the same scale
as the other samples, with the caption: «Reemplaza solo la pantalla que
falló; la barra de pestañas y las demás pantallas siguen. Reintentar la
vuelve a dibujar.»

## 3. README — «Recovery screen (Client and Staff)»

After «Lists between rules (Client and Staff)», add:

> ### Recovery screen (Client and Staff)
>
> - When a screen fails while drawing, the app shows the plain empty state in
>   its place: «Algo salió mal» in Lora 21 weight 500, the 14px `#766D69`
>   note «No pudimos mostrar esta pantalla. Inténtalo de nuevo; si vuelve a
>   pasar, cierra la app y ábrela otra vez.» up to 260px wide, and the
>   regular «Reintentar» primary button at least 220px wide, centred on
>   Superficie with no card and no icon. It replaces only the failed screen
>   (the Client tab bar and the other screens stay); when the failure is
>   above every screen it fills the viewport.

## What must remain untouched

Every numbered screen; the framed and plain empty states and their copy;
the primary button; every other card of the design system and every other
README section.
