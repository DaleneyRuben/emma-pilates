# Deliver published Promotion images publicly

Status: accepted

Publishing an active Promotion exposes only its rebuilt responsive variants through public, versioned, non-guessable Cloudflare R2 URLs. The API returns those URLs while the Promotion is eligible to be shown, and clients may cache them as immutable assets. Replacing an image creates new keys, so clients never need to overwrite cached content at an existing URL. Draft Promotion images, Client and Staff Member profile photos, transfer receipts, and pending uploads never enter the public namespace.

The private Promotion variants remain the source for later publication. Unpublishing, reaching the end of the display period, replacing the image, or deleting the Promotion immediately removes its public variants from the R2 origin and requests cache invalidation; the private variants remain only while the Promotion still references them under [ADR-0076](./0076-delete-detached-profile-and-promotion-images.md). A public URL is intentionally shareable while it exists, and deletion cannot recall a copy that another device has already downloaded.

Public R2 delivery was selected because Promotion artwork is non-sensitive, benefits from edge caching, and should not consume NestJS bandwidth or require repeated signed-URL requests. Proxying every image through the API was rejected because it would add application bandwidth and availability dependencies. Treating every Promotion image as permanently public was rejected because drafts and inactive Promotions should not be exposed.
