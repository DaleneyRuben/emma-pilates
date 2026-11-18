-- FIX-081 (walkthrough finding 118): a Staff Member's gender decides how her
-- Role reads («Coordinadora» or «Coordinador»). Every existing row takes the
-- feminine form the labels have always used; nothing else changes.

-- CreateEnum
CREATE TYPE "booking"."StaffGender" AS ENUM ('female', 'male');

-- AlterTable
ALTER TABLE "booking"."staff_members" ADD COLUMN     "gender" "booking"."StaffGender" NOT NULL DEFAULT 'female';
