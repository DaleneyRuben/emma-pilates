# Follow-up — Promociones and its form as WEB-006 built them

Targets: **Admin web `AW17` and `AW18`**. Send this alongside
[30](./30-invariants-checklist.md), with [39](./39-align-booking-membership-schema.md)
§3 and [60](./60-image-crops-and-formats.md) §2, which it completes (a sent
follow-up is never edited).

---

WEB-006 built the Promociones page and its side panel against `AW17`, `AW18`,
39 §3, and 60 §2, and the backend UPL-002 delivered. A few states the
prompts do not draw, and one piece of copy the API cannot supply, were decided
in the app; make the frames show them. Change nothing else.

## 1. `AW17` — Empty carousel and the result line

- Add an empty frame: the header reads **Ninguna promoción en el carrusel**,
  the card area is one bordered box with «Todavía no hay promociones.» and
  the quieter «Crea la primera con «Nueva promoción»; las clientas la verán en
  el inicio de la app cuando la publiques.». The primary button stays.
- The subtitle counts the cards: «1 promoción en el carrusel», or
  «N promociones · arrastra para cambiar el orden».
- After a save, publish, unpublish, or deletion, one Éxito-tinted line under
  the header names it, as `AW02` and the Back Office pages do (53 §4):
  «Promoción «…» guardada como borrador.», «… guardada.», «… publicada.»,
  «… ya no se publica en la app.», «… eliminada.».
- A card without an image (a draft) shows the `#EFE0DC` block with the photo
  glyph and «Sin imagen» in place of the thumbnail.
- At 420 px the headline wraps to two lines instead of truncating, and the
  window keeps the full «Del dd/mm/aaaa al dd/mm/aaaa» rather than the short
  «01/08 – 31/08/2026».
- Keyboard reordering exists: the six-dot handle is a button; the space bar
  takes the card, the arrows move it, the space bar drops it, and Escape
  puts it back. Note it in the frame's annotations; no new visual is needed.

## 2. `AW18` — Footer by state and the delete action

Follow-up 39 §3 asked for «Guardar borrador» and «Publicar» and a «Dejar de
publicar» action. As built:

- A new Promotion or a draft: **Guardar borrador** (secondary) and
  **Publicar** (primary, disabled until image, título, descripción, and both
  dates exist).
- A published Promotion: **Guardar cambios** (primary) and **Dejar de
  publicar** (Error outline).
- A published Promotion whose image was replaced or removed shows a
  warning box (Advertencia tint) above Título: «Al cambiar la imagen, la
  promoción deja de publicarse al guardar; publícala de nuevo cuando la nueva
  imagen esté lista.» or «Sin imagen, la promoción deja de publicarse al
  guardar; publícala de nuevo cuando subas otra.», and the footer becomes the
  draft pair.
- Every edit frame ends with a quiet **Eliminar promoción** link in the
  Error tone under the footer buttons. It opens the standard confirmation
  (53/55 convention): title «¿Eliminar la promoción «…»?», body «Se quita del
  carrusel y de esta lista, y su imagen se borra. Esta acción no se puede
  deshacer.», **Volver** (compact neutral) and **Eliminar** (Error outline).
  Draw one frame with the dialog open.

## 3. `AW18` — The attached image's caption and crop hint

- The API keeps no filename, so an already-attached image is captioned
  **Imagen actual · 1600 × 900** in the edit frame instead of
  `trae-una-amiga.jpg · 1600 × 900`; a file chosen in this session keeps its
  name. If the studio wants the filename kept, it is a backend proposal
  (recorded in WEB-006), not a design change.
- Under the caption, when the file is not 16:9, one line explains 60 §2's
  dimmed edges: «Se recorta al centro en 16:9: se pierden los bordes
  laterales.» or «… se pierden los bordes superior e inferior.».
- The drop target's hint line reads «Arrastra el archivo o haz clic · JPG,
  PNG o WEBP horizontal, mínimo 1200 × 675 px»; a refused file names its
  reason under the target in the Error tone: 60's too-small message, «Elige
  un archivo JPG, PNG o WEBP.», «La imagen pesa más de 20 MB.», or, when the
  worker refuses it, «No pudimos procesar la imagen. Revisa que sea un JPG,
  PNG o WEBP de al menos 1200 × 675 píxeles y que no esté animada.». While
  it uploads the target reads «Subiendo la imagen…».
- Edit mode's window line (already in the prompt) reads «Se está mostrando
  ahora: hoy está dentro del rango.» or «Hoy está fuera del rango: se guarda
  pero no se muestra.» and appears only on a published Promotion.

## Preserve everything else

Do not change the drag visuals of `AW17`, the image-first order of `AW18`,
the states of 39 §3, the crop preview of 60 §2, the shell, or any screen not
named in Targets.
