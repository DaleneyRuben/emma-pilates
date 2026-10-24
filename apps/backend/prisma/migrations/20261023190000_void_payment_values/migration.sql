-- PAY-006, booking ADR-0012: a void is a state, never a delete (ADR-0086).
-- A new enum value cannot be used in the transaction that adds it.
ALTER TYPE "booking"."PaymentState" ADD VALUE 'voided';
ALTER TYPE "booking"."BookingCancellationCause" ADD VALUE 'payment_voided';
