# Copy production into staging as a last resort

Status: accepted

Staging may hold an unmodified copy of production's database, but only as a last resort: when a bug cannot be reproduced with staging's own data. This amends the data rule of [ADR-0092](./0092-release-to-staging-before-promoting-to-production.md), which allowed synthetic data only; everything else in ADR-0092 stands. The owner decided on 2026-10-17 that the copy is not anonymized, because a bug may depend on exactly the values that anonymizing would change.

The `Copy Production to Staging` workflow is started by hand and asks for a typed confirmation. It restores the newest daily dump from the backup bucket (at most a day old, or fresher after a manual run of the `backup` job) into `emma_staging`, replacing everything there, and then releases `main` to staging again so the schema matches the code. It never connects to the production database: GitHub holds a read-only token for the backup bucket and staging's own database password, and the staging role cannot open production's database. Uploaded images are not copied; R2 objects stay in production's bucket.

While a copy exists, staging holds the same personal data as production. Whoever starts the workflow is responsible for that copy: staging's database, Vercel project, and Northflank team are owner-only, a personal-data request ([runbook](../runbooks/personal-data-requests.md)) must also be applied to staging or answered by replacing the copy, and the copy is no longer needed once the bug is fixed. Restoring a fresh synthetic state means releasing a database reset, which is outside this workflow.

An anonymized copy was rejected by the owner for the reason above. Copying through a direct production database connection was rejected because it would put production database credentials in GitHub; the daily dump already exists, is checked against its digest, and its restore doubles as a backup check.
