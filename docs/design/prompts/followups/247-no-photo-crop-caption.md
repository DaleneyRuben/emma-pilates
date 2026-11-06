# Follow-up — No crop caption under a profile photo

Targets: **C22 Editar perfil** (Client app v2), **S23 Perfil** (Staff app
v2), **P07 Estudio › Personal** member panel (admin web v2), and the proposal
boards `design/v2/propuestas-foto-equipo/` (A1, A2, A5, A6, B1, B2, B5, B6).
Read with [60](./60-image-crops-and-formats.md) §1,
[63](./63-client-profile-photo-as-built.md),
[241](./241-staff-profile-photo-proposals-corrections.md) and
[242](./242-staff-profile-photo-on-the-screens.md). Send
[30](./30-invariants-checklist.md) alongside.

---

Written on 2026-11-05 for the second walkthrough's finding n.º 21. The owner
said the line under the photo in the client's Editar perfil, «Se recorta al
centro en forma de círculo.», is «una información innecesaria».

## The change

From here on, no profile photo editor shows a crop caption. This withdraws
60 §1's note and its wording in 63 §2, 241 §2 and 242:

- **C22:** the line «Se recorta al centro en un círculo.» under «Cambiar
  foto» goes. The circle and the button stay as they are.
- **S23:** the line «Se recorta al centro en forma de círculo.» under the
  photo goes. «Tu nombre y tu correo los actualiza administración.» stays.
- **P07's member panel:** the line becomes only «JPG, PNG o WebP, hasta 10
  MB.»
- **The proposal boards** drop the caption from every state, so they keep
  matching the screens they are the reference for.

The photo is still centre-cropped by the circle; only the words go. The
superseded phone proposals in `design/v2/propuestas-telefono/` stay as they
were exported.

## Leave untouched

Everything else on these screens and boards.
