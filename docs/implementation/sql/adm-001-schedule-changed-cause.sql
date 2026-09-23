-- ADM-001 C3: cancellation cause for Sessions a schedule change withdraws.
-- Its own migration: a new enum value cannot be used in the transaction that
-- adds it (see docs/implementation/ADM-001-migration-review.md).
ALTER TYPE "booking"."SessionCancellationCause" ADD VALUE 'schedule_changed';
