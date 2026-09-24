# Follow-up — Show the crops the image pipeline applies

Targets: **Client `22`; Admin web `AW18`**. Send this alongside
[30](./30-invariants-checklist.md).

---

UPL-002 rebuilds every uploaded image into fixed serving variants
(`docs/implementation/UPL-002-image-variants.md`). Two of those sizes needed a
framing decision no screen had made, so the implementation took a technical
default. Make the screens show what the pipeline does; do not change the
pipeline's sizes, the upload flow, or any other screen.

## 1. Profile photo framing on Client `22`

The backend centre-crops a profile photo into a square (320 × 320 for display,
96 × 96 for the small cells) because no screen supplies a crop. On `22`, after
"Cambiar foto", show the chosen photo inside the circular avatar exactly as the
centre crop will frame it, with a one-line note under it: "Se recorta al centro
en forma de círculo." Do not add a manual crop tool in this follow-up; if the
studio wants one later, it is a separate decision.

## 2. Promotion crop and preview on `AW18`

The backend centre-crops a Promotion image to 16:9 (480 × 270, 960 × 540,
1440 × 810) and refuses anything smaller than 1200 × 675.

- Keep the dashed drop target and its "JPG/PNG, mínimo 1200 × 675" line; add
  "también WEBP".
- Show the attached preview at 16:9 with the edges the crop discards dimmed, so
  a portrait or square file makes the loss obvious before saving.
- Under the preview, keep the filename and dimensions; add the message the API
  returns when an image is too small: "La imagen debe medir al menos
  1200 × 675 píxeles." (the upload ends `failed` with
  `image_dimensions_too_small`).

## Preserve everything else

Do not touch the states from follow-up 39, the drag order on `AW17`, the
avatar rules of invariant 9, or any screen not named in Targets.
