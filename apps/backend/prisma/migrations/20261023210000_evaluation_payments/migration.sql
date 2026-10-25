-- NUT-003, booking ADR-0011. A new enum value cannot be used in the
-- transaction that adds it, so the checks live in the next migration.
ALTER TYPE "booking"."EvaluationState" ADD VALUE 'no_show';
ALTER TYPE "booking"."EvaluationCancellationCause" ADD VALUE 'payment_expired';
ALTER TYPE "booking"."EvaluationCancellationCause" ADD VALUE 'payment_voided';
CREATE TYPE "booking"."PaymentKind" AS ENUM ('plan', 'evaluation');
