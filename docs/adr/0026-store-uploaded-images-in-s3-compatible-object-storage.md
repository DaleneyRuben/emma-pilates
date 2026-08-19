# Store uploaded images in S3-compatible object storage

Status: accepted

Uploaded image bytes will live in S3-compatible object storage rather than PostgreSQL or the backend filesystem. PostgreSQL, selected in [ADR-0011](./0011-use-postgresql-with-schema-per-bounded-context.md), remains the authoritative store for each object's opaque storage key, purpose, ownership, media type, byte size, checksum, lifecycle state, and relationship to the owning record. Provider URLs are derived at delivery time and are never canonical database identifiers.

Storage access follows the sensitivity of the owning workflow. Transfer-receipt screenshots are private and available only through an authorized Payment workflow. Client profile photos are not anonymously enumerable. Promotion drafts remain private, while published Promotion images may be exposed through a cacheable public delivery path because they are intentionally shown to every client. Separate namespaces and storage policies prevent a public asset rule from exposing a private object.

The backend owns a narrow object-storage interface; domain models and API contracts do not expose provider SDK types, bucket names, or credentials. Uploads use server-generated object keys and are not accepted as application records until their declared type, actual content, size, and ownership have been validated. Because an object-store write and a PostgreSQL transaction cannot commit atomically, the upload workflow must have explicit pending and finalized states and must reconcile abandoned or orphaned objects.

Object storage was selected because it keeps database backups small, supports private temporary access and efficient cacheable delivery, and permits backend instances to remain stateless. Storing binary data in PostgreSQL was rejected because image growth would enlarge transactional backups and make cacheable delivery depend on the API and database. A server filesystem was rejected because it couples files to one runtime instance and complicates deployment, recovery, and horizontal scaling.

This decision does not select the object-storage provider, direct versus backend-proxied uploads, signed-URL lifetime, image transformation service, maximum dimensions and sizes, malware-scanning policy, encryption-key strategy, CDN, or retention and deletion periods.
