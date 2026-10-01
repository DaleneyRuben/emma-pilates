-- BE-012 S10: an event kind for an admitted authentication-email request,
-- counted by the client-wide and network-wide budgets whether or not an email
-- is issued (docs/implementation/BE-012-email-source-budgets-proposal.md).
-- AlterEnum
ALTER TYPE "system"."AuthenticationThrottleEventKind" ADD VALUE 'email_requested';
