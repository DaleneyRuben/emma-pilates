# Follow-up — A profile photo for the staff: proposals

Targets: **S23 Perfil** (every role), **S08 Detalle de sesión** and **HOR
Horario** (Staff app v2); **P07 Estudio › Personal** with its member panel,
**the top bar's account chip** and **P02 Horario** (admin web v2, 1440 and
420 px); **C03 Reservar**, **C04 Detalle de sesión** and **C05 Mis
reservas** (Client app v2). Proposals only, on a canvas of their own. Read
with [225](./225-visual-system-v2.md), [233](./233-admin-web-pages-on-v2.md),
[63](./63-client-profile-photo-as-built.md),
[67](./67-settle-invariant-9-profile-photo.md) and
[93](./93-busy-buttons.md). Send [30](./30-invariants-checklist.md) alongside
this follow-up. No exported screen is regenerated: the owner picks one
proposal, and a later follow-up carries it into S23, S08, HOR, P07, P02, the
top bar, C03, C04 and C05.

---

Written on 2026-11-05 for the second walkthrough's finding n.º 12 (owner's
decision of 2026-11-05).

## Why

- **Every staff account shows initials** («DO», «AM»). Clients already upload
  their own photo from C22 Editar perfil (MOB-020, follow-ups 60 and 63); the
  staff have a place for one in the data but no way to set it and no screen
  that shows it.
- **The owner decided who uploads it:** each person from her own **Perfil**
  in the Staff app, and the **Administrator and the Coordinator** from the
  admin web, for anyone on the team (Estudio › Personal › the member panel).
- **And where it shows:** in the Client app next to the trainer's name
  (Reservar, the class detail, Mis reservas); in the admin web (the Personal
  list, the member panel, the top bar's account chip, Horario); in the Staff
  app (Perfil and wherever the person appears: the class detail's
  «Entrenadora» row, Horario).
- **This amends 67 §2.** From here on, read 67 §2 as: a photo may appear on
  the Client's own profile (C18, C22) and, for the staff, on every surface
  this follow-up names, including the admin web's top bar account chip. The
  Client app's header avatar (C02) and any other client photo stay as 67
  says. Where no photo is attached, the initials on Rosa tinte stand in, as
  today.

## What is fixed in every proposal

- **The circle.** The photo fills the circle, centre-cropped (the backend
  keeps a 320 × 320 and a 96 × 96 square, follow-up 60), no border, no ring.
  Without a photo: the two initials, Lora, Rosa enlace `#7D4F4B` on Rosa
  tinte `#F2E4E1`, as S23 and C22 draw them now. Sizes: 96 in the editors,
  72 on the S23 summary, 40 in the web top bar and the Personal list, 36 in
  rows, 20 inline beside a name in a line of text.
- **The upload.** Mobile opens the system photo library (the same picker
  C22 uses; no photo library permission prompt). The web opens the file
  dialog, «JPG, PNG o WebP, hasta 10 MB.» The chosen photo shows in the
  circle at once, exactly as the crop will frame it, and is saved the moment
  the upload finishes, independently of any «Guardar» button (as C22).
- **The states**, drawn on every editor:
  1. **Sin foto**: initials; «Cambiar foto» only.
  2. **Subiendo**: the chosen photo in the circle, a 50 % Marfil veil over it
     with the 93 busy ring (Palo de rosa, 24 px) in the middle; the controls
     are replaced by «Subiendo foto…» in Tenue.
  3. **No se pudo subir**: the previous photo or the initials come back; the
     v2 warning row (Lino, 36 px `#F7E5E0` disc, Error `#A04E3E` `error`
     icon) «No pudimos subir la foto. Inténtalo de nuevo.»; on the web, a
     wrong file reads «Elige una foto JPG, PNG o WebP de hasta 10 MB.» in the
     same row. The controls come back.
  4. **Con foto**: the photo; «Cambiar foto» and «Quitar foto».
  5. **Quitando**: the photo under the veil and ring, the controls replaced
     by «Quitando foto…».
  6. **No se pudo quitar**: the photo back, the warning row «No pudimos
     quitar la foto. Inténtalo de nuevo.»
  «Quitar foto» acts at once, with no confirmation (63: «Cambiar foto» puts
  one back). The same states apply when the Administrator or the Coordinator
  changes someone else's photo.
- **The person sees whose photo it is.** On the web member panel the circle
  sits beside the member's name; S23 keeps the name and email beside it.
  S23's note «Tus datos los actualiza administración.» becomes «Tu nombre y
  tu correo los actualiza administración.», since the photo is now hers to
  change.
- **Sample people**: Daniela Ortiz (Entrenadora) and Emma Vargas
  (Entrenadora) with photos, Andrea Suárez (Entrenadora) without, Paola
  Mendoza (Administración) with a photo in the top bar, Carolina Rivas
  (Coordinación) without. The photos are neutral illustrated portraits, not
  real people.

## The proposals

Two, each a clickable prototype for iPhone and Android (Staff app and
Client app) and for the web at 1440 and 420 px:

- **A · Botones a la vista** (recommended). The editors show the circle with
  the buttons beside it, like C22: S23's summary grows to a 72 px circle
  with a secondary «Cambiar foto» and a text «Quitar foto» under the name
  and email; the web member panel opens with a 96 px circle, the name, and
  the same two buttons, above the form. Where the trainer appears, a 20 px
  photo leads her name in the line of text: C03's «Emma Vargas · 50 min»,
  C05's «08:00 – 09:00 · Daniela Ortiz · Achumani», HOR's rows and P02's
  session blocks; C04's «Entrenadora» row and S08's swap the icon disc for
  her 36 px photo.
- **B · Toca la foto.** The circle itself is the control: a 28 px Palo de
  rosa disc with a white `photo_camera` icon sits on its lower right. On the
  phones, tapping the circle opens a sheet («Elegir de tus fotos», «Tomar una
  foto», «Quitar foto» in Error when there is a photo, «Cancelar»; the v2
  bottom sheet of S23 «Cerrar sesión», on both phones), and B adds the camera,
  so the app asks for camera permission the first time. On the web, the
  circle shows «Cambiar» on hover and opens a small menu («Subir una foto»,
  «Quitar foto»), and a photo can be dropped on it. Where the trainer
  appears, the face is bigger and the line of text stays as it is: a 40 px
  photo at the right end of C03's rows and C05's cards, a «Tu entrenadora»
  card on C04 with a 64 px photo, and P02's blocks show her photo only in
  the session's side panel (the week stays text, it is dense).

## What every board shows

- **Staff app (iPhone 390 × 844, Android 412 × 915):** S23 Perfil in the six
  states (and, for B, the sheet open), plus S08 «Entrenadora» and HOR
  Horario with Daniela's and Emma's photos and Andrea's initials. A dark
  «Prototipo» strip above each board has one chip per state; tapping the
  controls moves through the states (Cambiar foto → Subiendo → Con foto,
  Quitar foto → Quitando → Sin foto).
- **Client app (iPhone, Android):** C03, C04 and C05, one chip each, with
  the same three trainers.
- **Web 1440:** Estudio › Personal with the photos in the list and Paola's
  photo in the top bar; «Abrir» on Daniela opens the member panel with the
  six states; a chip for the Coordinator's view (Carolina, initials in the
  top bar; she can change photos too); a chip for Horario.
- **Web 420:** the same, with the member panel full width.

## The index board

A first board «Foto de perfil del equipo» with the two proposals as cards:
name, one line on how it works, a small drawing, and links to their boards.
Under the cards a comparison table (how a person finds the control, the
camera, where the trainer's face shows, how much of today's code changes)
and «Recomendada» on A: it reuses C22's built pattern and the client photo's
upload as is, needs no camera permission, and puts the faces where the
owner asked without changing any row's layout. Brand «Emma Pilates Studio»
in full, no tagline.

## Leave untouched

Every exported screen. Only v2 tokens (Marfil, Lino, Rosa tinte, Palo de
rosa for the one primary button per screen, Rosa enlace for text buttons,
Error only for errors). The client's own photo on C18 and C22 does not
change. Copy is the product's as quoted above; the new copy is limited to
«Quitando foto…», «Tu nombre y tu correo los actualiza administración.», the
web file line, the Coordinator's notice «Puedes cambiar sus sedes y su foto.
Invitar y cambiar roles lo hace Administración.», and B's sheet and menu
labels.
