# UX-013 · Accessibility audit

Date: 2026-10-23. Scope: the Client app, the Staff app, `packages/mobile-core`, and the admin web as they ship on this branch (`chore/ux-013-accessibility-audit`, from `main` at 9d779ff7). Method: a code audit, plus the Jest assertions that already exist for the loading logo and the side panel. This is the session UX-001 finding X3 asked for.

**The device pass was not run.** VoiceOver, TalkBack, Dynamic Type at the largest accessibility size, and Reduce Motion on a Simulator or emulator were not exercised. The launch queue holds `/private/tmp/pilates-sim.lock`, and this item was told not to take it and not to start a Simulator, an emulator, Metro, or the API. Nothing below claims a screen reader walked a screen. Clipping, reading order, and focus are inferred from the source and from testing-library, and each one still needs a device pass before it can be called fixed.

UX-002, UX-003, and UX-004 are this item's dependencies and are not all merged here. The audit is of `main`. Findings that touch screens those pull requests rewrite are marked **waits for** that PR; the rest can land on `main` as it is.

## Executive summary

**Verdict:** the shared pieces are in better shape than X3 assumed, and the gaps are specific.

- Dynamic Type is not disabled anywhere (`allowFontScaling={false}` and `maxFontSizeMultiplier` do not appear). Text can still clip, because a handful of containers fix a height around a label, and several titles set a `lineHeight` only a little above `fontSize`.
- Reading order on the sampled roots and the booking flow is mostly the visual order. Buttons built from the shared primitives carry a Spanish label. The holes are cards and chips whose label drops the state a sighted person sees (seat count, time, Branch), and the Client tab bar, whose icons are hidden while the tab itself is the accessible name.
- Reduce Motion is already honoured by the one animated loading state, on both mobile (`LoadingState`) and the admin web (`.carga-logo`). No new hook and no animation rewrite. The launch splash fade is the leftover, and it is native.
- Admin keyboard order is the Radix dialog default: focus moves into the panel, onto the close control, not onto the first field. Escape and «Cerrar» are labelled. Inputs follow DOM order.

Severity: **medium** is something a person using the largest text size or a screen reader hits on a daily screen; **low** is a label that is present but incomplete, or a focus landing that is legal but not the field. Counts: 3 medium, 4 low.

## Method and coverage

| Check | What was read | What was not done |
|---|---|---|
| Dynamic type | `fontSize`, `lineHeight`, `height`, `numberOfLines`, `allowFontScaling`, `maxFontSizeMultiplier` under `apps/client-mobile`, `apps/staff-mobile`, and `packages/mobile-core` | No Simulator at the largest accessibility size; no measurement of clipped glyphs |
| Reading order | Client Home (`home-screen.tsx`, `home-shortcuts.tsx`, `promotions-carousel.tsx`), Reservar (`browse-sessions-screen.tsx`, `session-card.tsx`), session detail (`session-detail-screen.tsx`), Staff Trainer root (`trainer-agenda-screen.tsx`, `root-header.tsx`, `account-avatar.tsx`), plus the shared buttons, glyphs, and tab icon | No VoiceOver or TalkBack pass; not every screen (see «Sampled, not exhaustive») |
| Reduce Motion | `AccessibilityInfo`, `Animated.loop`, `withRepeat`, Moti, `prefers-reduced-motion` across the three apps and mobile-core | The system setting was not toggled on a device |
| Admin keyboard | `side-panel.tsx`, `sheet.tsx`, `client-detail-panel.tsx`, `session-panel.tsx` with `session-create-form.tsx`, `confirm-dialog.tsx` | No browser Tab walk |

Sampled, not exhaustive: the four flows above, and a spot check of Perfil rows, the promotions switch, the QR card, notification rows, and the shared `PrimaryButton` / `OutlinedButton` / `TextButton` / `ScreenTopBar`. A Pressable with a text child and no `accessibilityLabel` still exposes that text on React Native; those were not listed as unlabeled. Icon-only controls were.

## Findings

### Dynamic type

| # | Surface | Finding | Severity | Waits for |
|---|---|---|---|---|
| A1 | Client tab bar, both apps' screen titles, unread pill, payment status disc | Text sits in a box that does not grow with it. `ScreenTopBar` draws the title with `numberOfLines={1}` (`packages/mobile-core/src/ui/screen-top-bar.tsx` line 42), so a long title at a large size truncates instead of wrapping. `UnreadCountPill` fixes `height: 18` and `lineHeight: 14` around an 11 pt label (`packages/mobile-core/src/ui/unread-count-pill.tsx` lines 31–44); the Client tab badge and the Perfil row badge use it. The payment-status disc is `height: 72` / `width: 72` around a 30 pt glyph (`apps/client-mobile/src/payments/payment-status-screen.tsx` lines 167–175). The Client tab bar sets `fontSize: typography.tabLabel` (11) and does not raise `tabBarItemStyle` (`apps/client-mobile/src/navigation.tsx` lines 114–123); React Navigation's default item height does not grow with the label. | medium | — |
| A2 | Headings, Home tiles, carousel, credit amount | `lineHeight` is a constant next to a scaling `fontSize`, so at the largest size the line box is shorter than the glyphs and the descenders clip. `Heading` is 30 pt with `lineHeight: 36` (`packages/mobile-core/src/ui/heading.tsx` lines 11–16), used by Home, Reservar, session detail, and the Trainer root. Home's tile title is 16 pt with `lineHeight: 21` (`apps/client-mobile/src/home/home-shortcuts.tsx` lines 141–146). The carousel headline is 18 / 24 and the description 13 / 20 (`apps/client-mobile/src/home/promotions-carousel.tsx` lines 152 and 172). The credit amount is 64 / 72 (`apps/client-mobile/src/payments/credit-screen.tsx` lines 129–134). Most other text has no `lineHeight` and is fine. | medium | — |
| A3 | Reservar day chips, Trainer day strip, Home shortcut icon tile | These do not fix a text height, so they should grow rather than clip. Recorded so the device pass knows where to look, not as defects. Day chips pad and do not set `height` (`browse-sessions-screen.tsx` lines 285–296). The Trainer day button is `minWidth: 44` with padding, and the label is the two-digit day (`trainer-agenda-screen.tsx` lines 148–151 and 187–194). The 44 pt shortcut tile holds an icon, not text (`home-shortcuts.tsx` lines 108–115). `numberOfLines={1}` elsewhere is the impersonation banner, the view-as Branch line, and the Assistant search contact, all of which truncate on purpose. | — | UX-007 rewrites the Trainer day strip (weekday names); re-check A3's Trainer row after that PR, and UX-015's Android chip clip is a separate layout bug, not Dynamic Type |

`allowFontScaling` and `maxFontSizeMultiplier` are unset everywhere, which is the right default. No screen turns scaling off.

### Reading order

Order on the sampled screens follows the tree, which matches the visual order: greeting, carousel, plan card, shortcuts on Home; title, Branch pill, day strip, class-type chips, cards on Reservar; back, title, facts, capacity, action on session detail; greeting, avatar, day strip, cards on the Trainer root. Decorative icons go through `LineIcon` (`accessibilityElementsHidden`, `importantForAccessibility="no-hide-descendants"`, `packages/mobile-core/src/ui/line-icon.tsx` lines 21–26), and `Chevron`, `Glyph`, and `ClientTabIcon` use it. Shared buttons set `accessibilityRole="button"` and a Spanish `accessibilityLabel`.

| # | Surface | Finding | Severity | Waits for |
|---|---|---|---|---|
| R1 | Reservar cards, session detail facts, Trainer agenda cards | The accessible name drops what the screen shows beside it. `SessionCard` is labelled with the class type and the time only (`browse-sessions-screen.tsx` lines 230–233); the seat pill («3 cupos», «Lleno») and the Trainer name are inside the same `Pressable`, so VoiceOver and TalkBack read the label and skip the children. Session detail's fact rows are a label `Text` and a value `Text` with no grouping (`session-detail-screen.tsx` lines 217–234), so a reader hears «Sucursal» and then «Centro» as two stops, and the capacity block is visual. The Trainer card is labelled with the class type alone (`trainer-agenda-screen.tsx` lines 62–64); time, Branch, and «2 de 12 reservados» are not in the name. The day chip's label is the ISO date `YYYY-MM-DD` (line 141), not «20» as drawn. | medium | UX-003 adds a «Ya reservada» pill on the Staff copy of this card; that pill needs to be in the label too. UX-007 adds the weekday to the Trainer strip; fold R1's date label into that, or do it here if UX-007 has not merged |
| R2 | Client tab bar | Tab icons are hidden, which is correct, and React Navigation names each tab from `title` («Inicio», «Reservar», «Mis Reservas», «Perfil»). The Perfil tab adds the unread count to that name (`profile-tab-button.tsx` lines 25–36). The other three tabs do not say they are tabs beyond what React Navigation adds on iOS, and the unread pill's digits can still be reached as their own element because `UnreadCountPill` is not hidden. Low, because the name exists. | low | — |
| R3 | Home plan card | The allowance bar is a `progressbar` with `min`, `now`, and `max` (`home-screen.tsx` lines 88–98) and the sentence under it repeats the numbers, so a reader hears the allowance twice. The card itself is not one element. Not a missing label. | low | — |

What was labelled, so nobody re-audits it: Home's «Ver detalle», «Comprar un plan», «Reservar una clase» (the disabled state and the lock icon are on the button; the lock is a `Glyph`), and both shortcut tiles (`label: summary`). Reservar's Branch pill (`Sucursal: ${name}`), branch rows, day chips (`weekday` + day), and class-type chips. Session detail's «Volver», «Reservar», «Unirme a la lista de espera», and «Comprar un plan». The Trainer avatar («Tu cuenta», plus «notificaciones sin leer» when the dot is showing). No unlabeled icon-only `Pressable` turned up in the sample.

### Reduce Motion

| # | Surface | Finding | Severity | Waits for |
|---|---|---|---|---|
| M1 | Launch splash | The in-app loading logo already respects Reduce Motion, and this audit does not rewrite it. `LoadingState` reads `AccessibilityInfo.isReduceMotionEnabled`, skips `Animated.loop`, and holds the logo still at full opacity (`packages/mobile-core/src/ui/loading-state.tsx` lines 41–47 and 96–114); `loading-state.spec.tsx` asserts the loop is not started. The admin first-load and page-switch logo does the same with `@media (prefers-reduced-motion: reduce)` (`apps/admin-web/src/carga.css` lines 58–64). No Moti, no Reanimated, no other `Animated.loop` in the apps. The leftover is the native launch splash: `holdLaunchSplash` asks Expo for a 300 ms fade and never reads the setting (`packages/mobile-core/src/ui/launch-splash.ts` lines 12–14). A one-file hook would only duplicate `useReduceMotion`, which already lives beside the only animation that can use it, so none was added. | low | — |

### Admin keyboard order

| # | Surface | Finding | Severity | Waits for |
|---|---|---|---|---|
| K1 | Every side panel, including Detalle de cliente and Nueva sesión | Opening a panel does not move focus to the first field. `SidePanel` renders Radix `SheetContent` with no `onOpenAutoFocus` (`apps/admin-web/src/components/panel/side-panel.tsx` lines 32–49; `sheet.tsx` lines 42–86). Radix focuses the dialog content, whose first tab stop is the close control, because `SheetPrimitive.Close` is the first focusable node (the title is a heading). That is a legal landing — focus is inside the panel, and it is named «Cerrar» (`sheet.tsx` lines 78–82, the X is `aria-hidden`) — but a keyboard user opens Nueva sesión and lands on close, then has to Shift+Tab or Tab through the title to reach Frecuencia. Escape closes the panel (`side-panel.spec.tsx`); an Escape inside a dialog layered on top does not. | medium | — |
| K2 | Detalle de cliente, Nueva sesión | Tab order follows the DOM, which is the visual order. Detalle de cliente (`client-detail-panel.tsx`) is read-only: summary rows, then «Cerrar cuenta» in the footer, then the close control if the user started from the top. The closure `ConfirmDialog` (`confirm-dialog.tsx` lines 41–63) puts «Volver» before «Cerrar cuenta», both named from their labels. Nueva sesión (`session-create-form.tsx` from line 131) is Frecuencia, then the fields in form order, then Guardar. Neither create form sets `autoFocus` except the expense category adder, which is a nested field and out of this sample. | low | — |

No restyle. Focusing the first field on open is a small change in `SheetContent` and is left as a backlog row so this audit stays a document: the client detail panel has no field, so the fix belongs on the shared sheet, verified against a create panel, not as a one-panel special case.

## What already holds

- Font scaling is on. Nothing sets `allowFontScaling={false}`.
- Decorative icons are hidden at the shared `LineIcon`, so a new glyph does not become a stop by default.
- Buttons from `PrimaryButton`, `OutlinedButton`, `TextButton`, and `BackLink` carry a role and a Spanish label.
- The loading logo, on mobile and on the admin web, is still when Reduce Motion is on, and the mobile behaviour has a unit test.
- Panels trap focus, name the close control, and close on Escape. The close control is the 30 px bordered square the design specifies.

## Items this audit produces

| ID | Finding | Work |
|---|---|---|
| UX-016 | A1, A2 | Let Dynamic Type grow the tab bar, the screen-title line, the unread pill, and the heading `lineHeight`s, then check the credit amount and the carousel |
| UX-017 | R1 | Put the seat count, the Trainer, and the time into the Reservar and Trainer card labels; name the Trainer day chip as a day, not an ISO date |
| UX-018 | K1 | On panel open, focus the first field of a create panel (Nueva sesión), and the heading when the panel has no field (Detalle de cliente); keep «Cerrar» and Escape |
| UX-019 | M1 | Skip the launch-splash fade when the platform reports Reduce Motion |
| UX-020 | R2 | Hide the unread pill's digits from the reader where the tab or the row already speaks the count |

UX-014 and UX-015 already exist, so the new rows start at UX-016. R3 and K2 are notes, not rows: hearing the allowance twice is noisy but true, and DOM order on the two panels is already the visual order.

## Device pass, when the lock is free

On the iPhone 16 Pro with the largest text size, and on the Android emulator with the largest font and TalkBack: Home, Reservar, one session detail, and the Trainer agenda. Confirm A1 and A2 clip, and that A3 does not. With VoiceOver and TalkBack, confirm R1 reads the label and skips the seat pill. On the admin web, Tab from a closed list into Detalle de cliente and into Nueva sesión and confirm focus lands on «Cerrar». Toggle Reduce Motion and confirm the loading logo is still; the launch splash (M1) needs a build that shows it, not Expo Go.
