-- FIX-004, owner decision 3 (2026-10-28): a void closes the Client's
-- waitlist entries tied to the voided Subscription. Expand-only. The value
-- is used by the next migration (a new enum value cannot be used in the
-- transaction that adds it).
ALTER TYPE "booking"."WaitlistClosureReason" ADD VALUE 'payment_voided';
