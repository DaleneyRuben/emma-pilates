# Follow-up — One phone error line for every country (libphonenumber)

Targets: the «Celular» field's error copy of
[236](./236-phone-field-prefix-with-flag.md) (C01b, C22, S05, S28 and the
web's Nuevo miembro, Editar miembro and client «Editar perfil»). Read with
decision 27 of `docs/decisiones-emma-pilates.md`.

---

Written on 2026-11-25. Follow-up 236 drew two invalid-number lines built from
hand-written rules: «Un celular de Bolivia tiene 8 dígitos y empieza con 6 o
7.» and «Un celular de <país> tiene <n> dígitos y empieza con <…>.». The rule
rejected real Bolivian mobiles that start with 5 (a tester's `+591 57007684`),
so the owner replaced every hand-written rule with Google's libphonenumber
metadata. libphonenumber says whether a number is a mobile of the country; it
does not give one length and first digit to quote.

From here on, read 236's invalid-number lines as one line for every country:

- «Ese número no parece un celular de <país>.» (e.g. «Ese número no parece un
  celular de Bolivia.»)

Everything else in 236 stays: the empty-field line, the prefix, the
placeholder «<n> dígitos» (now the digits of the country's example mobile:
«8 dígitos» for Bolivia, «9 dígitos» for Perú), and the stored shape. The
country list may offer every country libphonenumber knows, A–Z by Spanish
name, after the chosen country and the same «Frecuentes».

No generated screen under `design/` draws the invalid-number line (only the
DES-006 proposal boards in `design/v2/propuestas-telefono/` and
`design/v2/propuestas-paso9/` do, and they stay as the record of the
proposals), so this follow-up changes copy only and needs no export.
