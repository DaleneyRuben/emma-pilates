# Delete abandoned uploads after three days

Status: accepted

This replaces the one-day window of [ADR-0074](./0074-delete-abandoned-uploads-after-one-day.md); everything else in it stands. A pending upload, and every object or failed processing artifact it owns, becomes eligible for deletion three days after the upload was declared unless it has been attached to its intended resource. That includes an image that reached `READY` but was never attached, such as a receipt a Client replaced before sending.

Production keeps uploads in Cloudflare R2 ([ADR-0088](./0088-proxy-upload-bytes-through-the-api.md)), whose bucket has a lifecycle rule that deletes objects under `pending/` three days after they were written. The rule is a backstop for originals the application's hourly sweep never reached; using the same window for both keeps one rule to explain. When R2 removes an original first, the sweep treats the missing object as success, as ADR-0074 already requires, and still marks the database state.

Three days still recovers an interrupted upload and leaves unattached content short-lived. The cost of the longer window is storage for a few extra days of unattached images, well inside R2's free allowance.
