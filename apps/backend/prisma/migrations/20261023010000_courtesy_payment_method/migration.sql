-- REL-011 (booking ADR-0012): Courtesy Access settles a hidden Bs 0 Plan with
-- a `courtesy` Payment. The value is added on its own so the next migration
-- can name it in constraints after this one commits.

-- AlterEnum
ALTER TYPE "booking"."PaymentMethod" ADD VALUE 'courtesy';
