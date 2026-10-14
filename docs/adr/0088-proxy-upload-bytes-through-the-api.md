# Proxy upload bytes through the API

Status: accepted

[ADR-0026](./0026-store-uploaded-images-in-s3-compatible-object-storage.md) chose S3-compatible object storage with Cloudflare R2 as the production provider, and a three-step upload in which the client writes the bytes straight to the store through a presigned URL. This decision keeps the storage choice and replaces only how the bytes get there.

The client still declares the upload, writes the bytes, and asks for finalization, but the second step stays `PUT /api/v1/uploads/{id}/object` on the API in every environment. The API authenticates the request, checks that the caller owns a pending upload, and writes the bytes to the pending key in the configured object store. Finalization, verification, and rebuilding stay in the worker ([ADR-0073](./0073-rebuild-images-during-finalization.md)).

The Client app and the admin web already send the bytes to that route through the generated `getPutPendingUploadObjectUrl` with their bearer credential or session cookie, and they never read the declaration's `uploadUrl`. A presigned URL would break both: the apps would keep calling the API route, and a presigned request that also carries an `Authorization` header is refused by R2. Changing the protocol would need a store release of both apps that reads `uploadUrl`, followed by a release window under [ADR-0016](./0016-support-current-and-previous-mobile-releases.md) before the API route could stop accepting bytes.

The cost is the one ADR-0026 named: the API carries the bytes and holds the request open during slow mobile transfers. The API reads at most 25 MB per request, the largest purpose allows 20 MB, and the expected traffic is a studio's receipts, profile photos, and Promotion images, so one 512 MB instance holds it. The bucket stays private, needs no CORS rule, and is reached only with the API's and worker's credentials.

The object store is chosen per environment: production uses the S3-compatible adapter against R2, and local development, CI, and the shared development API keep the local-disk adapter. Production refuses to start without the S3 settings.

Presigned direct uploads remain the intended next step once a store release can adopt `uploadUrl`, or once traffic makes the API's share of the bytes matter. That change would keep the declaration and finalization steps and the stored identifiers.
