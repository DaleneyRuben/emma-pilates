# Follow-up — line boxes grow with Dynamic Type

Targets: **generated handoff `design/README.md`** (one sentence under the
mobile typography note) and the design system's type samples only if they
name a fixed line height next to a font size. No numbered screen changes:
the frames stay drawn at the default text size. Send
[30](./30-invariants-checklist.md) alongside this follow-up.

---

Written by UX-016 on 2026-10-26 from the accessibility audit
([UX-013](../../UX-013-accessibility-audit.md), findings A1 and A2). At the
largest text size a fixed line box is shorter than the glyphs, and a title
held to one line truncates. The apps leave those line boxes to the font.

Numbered 208. 207 is the admin loading state.

## 1. What grows

At a text size larger than the default, these stay readable. At the default
size they look as the frames already draw them.

- A screen title in the top bar wraps onto a second line instead of ending
  in an ellipsis. The back chevron and a trailing action stay on the first
  line.
- A heading, a body line, a Home tile title, and a Promotion headline and
  description take the font's own line box. Do not draw a line height that
  sits just above the font size.
- The unread count pill grows with its digits. At the default size it is
  still the 18 pt pill of follow-up 73, Palo de rosa profundo, never Error.
- The payment-status disc of screen 11 stays a circle at least 72 pt, and
  grows when the glyph does. The hourglass, check, and cross stay the white
  line icons of follow-up 111.
- The Client tab labels stay under the icons. The item is tall enough for
  the label at the largest size.

## 2. What stays

The impersonation banner, the view-as branch line, and an Assistant search
contact stay on one line with an ellipsis. Those truncations are deliberate.
Day chips, the Trainer strip, and the shortcut icon tile are not defects.
`allowFontScaling` stays on. Credit (screen 17) is retired, so it has no
amount to grow.
