-- IDN-009 / ADR-0102: the Coordinator, a Staff Role that runs the studio's
-- operation without seeing money. Adding an enum value is additive: no row
-- changes and every existing Role keeps its meaning.

-- AlterEnum
ALTER TYPE "booking"."StaffRole" ADD VALUE 'coordinator';
