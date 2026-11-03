# Follow-up — The Trainer's Referral Code gets its own page

Targets: staff `S23` Perfil (`design/v2/equipo/S23-Perfil.dc.html`) and the new
`S30-Mi-codigo`. Corrects the staff half of [228](./228-edit-referral-code.md).

---

Written on 2026-11-03. The owner reviewed 228 on the canvas and said the
Trainer's code should have its own page instead of a card inside Perfil.

## Change

- `S23` Perfil for a Trainer keeps its sections as they were and gains one
  row «Tu código de referido» showing `DANIELA` and a chevron, which opens
  `S30`. Other roles' Perfil boards stay untouched.
- New `S30-Mi-codigo` «Tu código de referido»: the code card in Rosa
  profundo with «Copiar», the text button «Editar código», «Cómo funciona»
  (las clientas que se registren con tu código quedan contigo), and the
  line «Puedes cambiarlo una vez cada 30 días».
- `S23b-Editar-codigo` and `S23c-Confirmar-codigo` open from `S30` and
  return to it, with the toast «Código actualizado».

Boards link as S23 → S30 → S23b → S23c → S30.
