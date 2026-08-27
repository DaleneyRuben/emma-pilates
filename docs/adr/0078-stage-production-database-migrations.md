# Stage production database migrations safely

Status: accepted

Each production backend release uses the reviewed migration command from the same immutable image as the API and worker. After the release revision passes its required GitHub Actions checks, one controlled Northflank migration job runs before the new API or worker revision is deployed. Production releases are serialized. If the migration job fails, the rollout stops, the existing API and worker remain running, and operators receive the failure without an automatic schema rollback.

Schema evolution follows expand and contract. An initial release adds backward-compatible structures while the old application can still run; later code switches reads and writes and performs any bounded backfill; only a subsequent release may remove an old column, constraint, or representation after no deployed process depends on it. Migrations avoid long blocking transactions and must provide an explicit rollout plan when a table rewrite, backfill, or incompatible PostgreSQL or pg-boss change cannot fit that pattern.

Running migrations when the API or worker starts was rejected because concurrent instances could race and a schema failure could turn an application restart into an outage. Fully manual production migration commands were rejected because they are easy to omit or run from the wrong revision. Automatically reversing a failed migration was rejected because database changes and already-written data are not generally reversible; recovery uses a reviewed compatible forward migration or application response appropriate to the incident.
