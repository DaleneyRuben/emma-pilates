# Delete detached profile and Promotion images

Status: accepted

A Client or Staff Member profile photo, or a Promotion image, is retained only while its owning record actively references it. Removing the image or deleting its owner makes every stored variant eligible for immediate deletion. Replacing an image first activates the successfully finalized replacement, then removes the old reference and dispatches deletion of every old variant; the system never deletes the current image before the replacement is safely active.

Deletion is idempotent and durably retried, with an already-missing object treated as success. No rollback grace period or archive of replaced images is kept. For a published Promotion, the application stops returning the old asset as soon as the reference changes; deleting an origin object cannot recall a copy already downloaded or cached, so cache invalidation and public URL behavior remain part of the separate public-delivery policy.

Keeping replaced images for a grace period was rejected because these small workflows do not justify retaining unused personal or promotional content and operating a restoration path. Deleting the old image before activating its replacement was rejected because a failed finalization would unnecessarily leave the profile or Promotion without its existing image.
