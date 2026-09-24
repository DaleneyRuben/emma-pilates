# UPL-002 image variants

Status: decided 2026-09-24 (UPL-002)

ADR-0073 left the exact serving dimensions and encoding quality of the rebuilt
image variants to implementation, "derived from the approved screen layouts".
This note records the values the finalization worker builds, the screen each one
is sized for, and the technical defaults taken where no screen gives a value.

Every variant is produced by fully decoding the verified upload, applying its
orientation, dropping every metadata block, and re-encoding with sharp. Sizes
are the box the image is fitted into; a smaller source is never enlarged. Pixel
budgets come from the screen's CSS size times the device pixel ratio the screen
is drawn for (2× for the admin web, 3× for the phones).

## Purpose → variants

| Purpose            | Variant (`image_variants.kind`) | Geometry                                       | Format | Quality                        | Sized for                                                                                                                                              |
| ------------------ | ------------------------------- | ---------------------------------------------- | ------ | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `transfer_receipt` | `thumbnail`                     | fit inside 800 × 800, aspect kept              | JPEG   | 80, mozjpeg, 4:2:0             | AW29's receipt in the 408 px panel (360 css px tall at 2× = 720) and S12's 320 pt card at 3× width; list rows never show the image                     |
| `transfer_receipt` | `readable`                      | fit inside 2048 × 2048, aspect kept            | JPEG   | 85, mozjpeg, 4:4:4 (text)      | AW29's enlarged viewer, `min(900px, 90vw)` by `90vh` at 2× (1800 × ~1620), and S12's full-screen pinch zoom (×4) on a 1179 px wide phone               |
| `profile_photo`    | `display`                       | cover 320 × 320, centre crop                   | JPEG   | 82                             | Client 22's avatar (about 96 pt at 3×) and 18's summary card; S23's 46 pt avatar                                                                       |
| `profile_photo`    | `thumbnail`                     | cover 96 × 96, centre crop                     | JPEG   | 80                             | The 26 px account cell in the admin top bar and the 26 pt header avatar at 3×                                                                          |
| `promotion`        | `promotion_480`                 | cover 480 × 270 (16:9), centre crop            | WebP   | 80                             | AW17's card thumbnails and 1× phones                                                                                                                   |
| `promotion`        | `promotion_960`                 | cover 960 × 540 (16:9), centre crop            | WebP   | 82                             | Client 02's carousel card (about 345–400 css px wide) at 2×                                                                                            |
| `promotion`        | `promotion_1440`                | cover 1440 × 810 (16:9), centre crop           | WebP   | 82                             | Client 02's carousel card at 3× (393 × 3 = 1179) and the tablet layout; AW18's attached preview                                                        |

## Rules that follow from the table

- A Promotion image must decode to at least 1200 × 675 pixels, the minimum
  AW18 states; a smaller upload fails finalization with
  `image_dimensions_too_small`. Receipts and profile photos have no minimum.
- The promotion crop is 16:9 from the centre. A source with another aspect
  loses its edges; the admin web's form can preview that later (WEB-006).
- Animated images fail finalization with `image_animated_not_allowed`
  (ADR-0072 accepts non-animated rasters only).
- Private variants live under `private/{purpose}/{image asset id}/{kind}` in
  the private namespace; public Promotion copies live under
  `public/promotion/{image asset id}/{kind}-{delivery version}` and get a new
  delivery version each time the Promotion is published (ADR-0077).
- The receipt route serves `readable` unless `?variant=thumbnail` is asked
  for, so the admin web and the Staff app keep their current behaviour; a
  receipt finalized before this item, which has no variants, falls back to its
  original object while that object still exists.
- The temporary original is deleted once every variant is stored and the asset
  is `READY` (ADR-0073).

## Technical defaults taken (design follow-ups, never edits of sent prompts)

- Profile photos are centre-cropped squares because no app screen supplies a
  crop yet (ADR-0073 expects the app to supply framing); the crop is a
  follow-up for the Client 22 prompt when that upload screen is built.
- WebP for Promotions (alpha kept, smaller at equal quality; iOS 14+ and every
  current browser decode it) and JPEG for receipts and profile photos (photos
  and screenshots, universally viewable when a staff member opens one outside
  the apps).
- Quality values are sharp defaults nudged for the content: text-heavy
  receipts use 4:4:4 chroma at 85 to keep bank details legible.
