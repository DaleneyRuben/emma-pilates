# Follow-up — the Client profile photo as MOB-020 built it

Targets: **Client `18`, `22`**. Send this alongside
[30](./30-invariants-checklist.md) and [60](./60-image-crops-and-formats.md)
§1, which it completes (a sent follow-up is never edited).

---

## The conflict to settle in the design session

Prompt `22` draws "Cambiar foto" ("uploads an image; initials-on-tint remains
the fallback if none is set") and follow-up 60 §1 asks `22` to preview the
chosen photo inside the circular avatar. Invariant 9 of the checklist says the
account avatar is "never a photo". Both cannot hold for the Perfil screens.

MOB-020 built the photo, because ADR-0073 and ADR-0076 treat the Client
profile photo as a product feature (a `profile_photo` upload purpose with its
own variants and deletion rule) and prompt 22 asks for it. Please decide one of
these and record it in the checklist:

- **Keep the photo on `18` and `22` only** (what ships): invariant 9 keeps
  governing the *header* account avatar ("Tu cuenta", two initials, rightmost
  in the header) on every Staff screen and on `02`; the Perfil summary card on
  `18` and the avatar on `22` show the Client's photo when one is attached and
  the initials otherwise. Reword invariant 9 to say "the header account avatar
  is never a photo".
- **No photo anywhere**: `22` loses "Cambiar foto" and 60 §1 is withdrawn.
  MOB-020 would then be removed from the app (backend and app both).

Until the studio decides, the app keeps the first option.

## 1. `18` — Summary card with the photo

- The 56 px circle on the summary card shows the photo centre-cropped by the
  circle (`resizeMode: cover`, the 320 × 320 display variant) when the Client
  has one; otherwise the two initials on Palo de rosa tinte as now. No border,
  no square.

## 2. `22` — Cambiar foto, Quitar foto, and the states

- Above the fields, a 96 px circular avatar (photo or initials), then the note
  "Se recorta al centro en forma de círculo." **only while a photo is shown**
  (60 §1), then two text links side by side: **Cambiar foto** and, only when a
  photo is attached, **Quitar foto**.
- Tapping Cambiar foto opens the system photo library (no camera in this
  release; HEIC is converted to JPEG on the phone). The chosen image appears in
  the circle at once, exactly as the crop will frame it, with the links
  replaced by the line "Subiendo foto…" while the upload runs (a few seconds:
  declare, upload, finalize, wait for the worker, attach).
- On failure, the initials (or the previous photo) come back and an error line
  in Error red reads "No pudimos subir la foto. Inténtalo de nuevo."
  ("No pudimos quitar la foto. Inténtalo de nuevo." for removal).
- Quitar foto removes the photo immediately (no confirmation: the photo is
  not data the Client can lose, and Cambiar foto puts one back) and the circle
  shows the initials again.
- Guardar cambios keeps saving only name and phone; the photo is saved the
  moment its upload completes, independently of the button.

## 3. Tablet

Same phone-first column as the rest of `22`; the avatar stays 96 px.

## Preserve everything else

Do not change the fields, the read-only email note, the button, the rows on
`18`, the header avatars of the Staff screens, or any screen not named in
Targets.
