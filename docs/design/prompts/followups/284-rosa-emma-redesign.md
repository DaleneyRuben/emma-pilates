# Follow-up — Rosa Emma: one scale, every screen redrawn

Targets: every client, staff and admin web screen and state in main at
62d8465fe. Exported to `design/v3/cliente`, `design/v3/equipo` and
`design/v3/admin`, with the system in `design/v3/sistema/`.

Written on 2026-11-20. The owner found the implemented palette B
«muy pobre y simple», so the visual direction was redone from scratch. The
owner approved the system, the direction «Franja rubor» (chosen over
«Cabecera rosa profundo», «Editorial con fotos» and «Bloques») and all
three canvases. From here on these boards replace [280](./280-base-comun-palette-b.md)
to [283](./283-staff-app-picks-e1-e9.md) for colour, type and surfaces.
Structure, copy and behaviour are unchanged: each board was redrawn from a
capture of main, or from its code where a state could not be reached in
the Simulator.

## The scale

The four brand pinks are one dusty-rose family at different lightnesses, so
they form one scale:

| Step | Hex | Brand name |
|---|---|---|
| 50 | `#FEF6F2` | |
| 100 | `#F9E7DF` | |
| 200 | `#E7CCBF` | Rubor |
| 300 | `#DAB9AB` | |
| 400 | `#CDA697` | Rosa arcilla |
| 500 | `#B78380` | Palo de rosa |
| 600 | `#93615D` | Rosa profundo |

Surfaces are crema `#F9F4F2` and white `#FFFBFB`. Rosa profundo is the
darkest tone, by the owner's decision. There are no darker inks, no greys
and no other hues.

## Where colour goes

Rosa profundo reaches 4.5:1 only on near-white, so colour lives in large
areas and small text sits on white:

- Screen background: 100.
- Header band: 200, with a large Lora title.
- The single strong block on a screen: 600, with white text.
- Secondary blocks: 500, with large white text only.
- Lists, data, forms, tables and dialogs: white cards with a soft shadow.
- The primary button and the selected filter or tab: 600 with white text.
- Class-type bars: Reformer 600, Mat 300, Cadillac 500.

Small text (under 19 px bold or 24 px regular) goes only on white, 50 or
600. On 100, 200 and 500 only large text is allowed. The web uses a rosa
profundo sidebar with white nav. A fixed white footer carries an upward
card shadow so it reads as a surface.

## Type

Lora is for titles and big numbers (34, 30, 28, 24 and 22 px). Work Sans
covers the rest: 16 px for row titles and buttons, 14–15 px for body, 13 px
for secondary text and 11 px for uppercase labels. Spacing is in multiples
of 4.

## References

- System page: https://claude.ai/artifact/KBuVQaq8XekzfhMNDQEvwy
- Direction: https://claude.ai/artifact/CwJJDLz8awhJuda3gVjbfF
- Client app canvas: https://claude.ai/artifact/BCWMiNkChpfWGznKppQkKL
- Staff app canvas: https://claude.ai/artifact/U1YmZywj2Y1DyaZ6Hwm4WC
- Admin web canvas: https://claude.ai/artifact/77Dc5y3sfiZEp9ttyU9tVx
