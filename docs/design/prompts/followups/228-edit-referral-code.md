# Follow-up — Edit your own Referral Code (client and Trainer)

Targets: client `C16` Invita a una amiga (`design/v2/cliente/C16-Invita-a-una-amiga.dc.html`)
plus three new client boards, and staff `S23` Perfil (`design/v2/equipo/S23-Perfil.dc.html`)
plus two new staff boards. Read with [225](./225-visual-system-v2.md),
[227](./227-client-app-on-v2.md) and the invariants in [30](./30-invariants-checklist.md).

---

Written on 2026-11-03 (BKM-017, walkthrough note 4). The owner decided on
2026-11-02 that every Client and every Trainer gets a readable code from her
name (Lucía Fernández → `LUCIA`) and can change it herself. C16 already has
the code card with «Copiar»; nothing draws the edit, and the staff app shows
no code at all.

## Rules the screens must show

- A code is 3 to 20 letters, digits or hyphens. It is typed in upper case
  (the field upper-cases as she types).
- While she types, the field says live whether the code is free:
  «Disponible» (success tone), «Ya está en uso» (error tone), «Ese código no
  está permitido» for a reserved or blocked word, «Usa de 3 a 20 letras,
  números o guiones» when malformed.
- One change every 30 days. After a change, the action is disabled and the
  card says «Podrás cambiarlo de nuevo el 3 de diciembre».
- Changing it makes the old code stop working. The confirmation says so in
  plain words: «Tu código anterior LUCIA dejará de funcionar. Las amigas que
  ya se registraron con él siguen contando para ti.»
- After saving, the toast «Código actualizado» (the v2 toast).

## Client (C16)

- `C16`: under the code card, a text button «Editar código» (the v2 text
  button, Rosa profundo), next to nothing else. Keep «Copiar» and its
  «Código copiado» toast exactly as drawn.
- New `C16c-Editar-codigo`: a bottom sheet over C16 titled «Editar tu
  código», the field prefilled with `LUCIA`, typed `LU-PILATES` showing
  «Disponible», the note «Puedes cambiarlo una vez cada 30 días», primary
  «Guardar código», secondary «Cancelar».
- New `C16d-Codigo-en-uso`: the same sheet with `SOFIA` and «Ya está en
  uso»; «Guardar código» disabled.
- New `C16e-Confirmar-codigo`: the confirmation with the old-code sentence
  above, «Cambiar código» and «Volver».
- After «Cambiar código», C16 shows `LU-PILATES`, the toast, and the line
  «Podrás cambiarlo de nuevo el 3 de diciembre» in place of «Editar código».

## Staff (S23, Trainer only)

- `S23` Perfil for a Trainer gains a «Tu código de referido» card above the
  account section: the code `DANIELA` in the same letter-spaced style as
  C16, «Copiar», and «Editar código». The line below: «Las clientas que se
  registren con tu código quedan contigo.» Other roles' Perfil boards stay
  untouched.
- New `S23b-Editar-codigo` and `S23c-Confirmar-codigo`: the same sheet and
  confirmation as the client, in the staff app's shell.

## Leave untouched

Every other board, the tab bars, «Cómo funciona», «Tus invitadas», and the
copy of the shared message. «Emma Pilates Studio», never the tagline.
Boards link as a clickable flow: C16 → C16c → C16e → C16; C16c ↔ C16d;
S23 → S23b → S23c → S23.
