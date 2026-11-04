-- BKM-018 (owner approval 2026-11-04): cancellation cause for the Sessions a
-- weekly series' pause withdraws, so resuming it restores exactly those.
-- Its own migration: a new enum value cannot be used in the transaction that
-- adds it.
ALTER TYPE "booking"."SessionCancellationCause" ADD VALUE 'schedule_paused';
