# Follow-up — «¿Cómo nos conociste?» in the Assistant's new Client form

Targets: **S05 (Nuevo cliente · Asistente)** and the **generated handoff
`design/README.md`** (the `S05` inventory row). Send
[30](./30-invariants-checklist.md) alongside this follow-up.

---

Written by BKM-011 on 2026-10-23. At the front desk the Assistant creates the
Client's profile «con canal de adquisición y código, si tiene»
([decisiones-emma-pilates.md](../../../decisiones-emma-pilates.md), sections
5 and 10; Booking ADR-0009). `S05` gains the same question as the Client's
own registration (follow-up [140](./140-registration-acquisition-channel.md))
and an optional code.

## 1. The fields

In «Teléfono · Formulario», «Android · Datos completados», and «Tablet ·
Formulario centrado», after «Teléfono (opcional)» and before the note
«Enviaremos un enlace de activación al correo. Vence en 7 días.», add:

- **«¿Cómo nos conociste?»**: the eight chips of follow-up 140, in the same
  order and style (wrapping rows, 8px gaps, 44px tall, fully rounded, white
  with `#D8C9BB` border; the chosen one Palo de rosa `#B78380` with white
  text). «Teléfono · Formulario» shows none chosen; «Android · Datos
  completados» shows «Pasé por el estudio»; the tablet frame shows
  «Instagram».
- **«Código de referido (opcional)»**: a text field in the form's field
  style, placeholder «De una clienta o de una instructora», upper case. The
  Android frame shows «CARLA» typed in it.

The question is required: add a frame **«Teléfono · Falta el canal»** after
«Teléfono · Correo de otra cuenta», the form filled with no chip chosen, the
chips' borders in Error `#B25D4B`, and **«Elige cómo nos conociste.»** under
them in 13px `#94493A`.

A code nobody holds keeps the form and marks the code field: add
**«Teléfono · Código desconocido»** after it, with «NADIE» in the code field,
its border in Error, and **«No encontramos ese código. Revísalo o déjalo
vacío.»** under it in the same error style. Nothing is created.

## 2. README

In the `S05` inventory row, after «email + optional phone», add «, the
required «¿Cómo nos conociste?» chips and an optional Referral Code (a
Client's or a Trainer's; the code decides the attribution)».

## What must remain untouched

The other `S05` frames' content («Verificación pendiente», «Correo de otra
cuenta», «Límite de tu cuenta»), every other screen, and the «Crear cuenta»
button.
