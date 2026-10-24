-- BKO-007: the Coordinator statement reuses Pay Statement and adds her line
-- kinds. Needs owner approval before any shared, staging, or production
-- database.

ALTER TYPE "back_office"."PayStatementLineKind" ADD VALUE 'base';
ALTER TYPE "back_office"."PayStatementLineKind" ADD VALUE 'new_client';
ALTER TYPE "back_office"."PayStatementLineKind" ADD VALUE 'bonus';
