-- BE-007 G4-G6: causes and reasons for Account closure. Its own migration: a
-- new enum value cannot be used in the transaction that adds it (see
-- docs/implementation/BE-007-migration-review.md).
ALTER TYPE "booking"."BookingCancellationCause" ADD VALUE 'account_closed';
ALTER TYPE "booking"."EvaluationCancellationCause" ADD VALUE 'account_closed';
ALTER TYPE "system"."AuthenticationSessionRevocationReason" ADD VALUE 'account_closed';
ALTER TYPE "booking"."CreditLedgerEntryKind" ADD VALUE 'account_closure';
