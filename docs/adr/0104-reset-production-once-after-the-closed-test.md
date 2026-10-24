# Reset production once, after Google approves the Client app

Status: accepted (2026-10-23); a one-off exception to [ADR-0086](./0086-soft-delete-every-database-row.md)

A personal Google Play account must run a closed test with at least 12 testers for 14 days before the Client app can be published. The testers register on production with their own email and book fictitious Sessions with Courtesy Access. The owner decided (2026-10-23) that everything they leave is erased once Google approves the app, rather than marking and filtering test rows forever.

The reset is a runbook step run by hand with a typed confirmation: it empties every business and identity table and the job queue, keeps the migrations, removes the receipt and profile images from the production bucket, and runs the first-Administrator bootstrap again. The last daily dump before it is the only copy of the test data and expires with the 30-day rule. Presale starts only after the reset.

This is allowed once, because no real Client exists yet. Once real Clients use production, ADR-0086 holds without exception.
