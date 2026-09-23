import { randomUUID } from 'node:crypto';
import {
  AuditActorKind,
  AuditOutcome,
  StaffRole,
} from '../generated/prisma/enums';
import type { Prisma } from '../generated/prisma/client';
import type { BackOfficeActor } from './back-office-errors';

// Back Office money records are audited in the same transaction as the change
// (ADR-0055, BKO-001 D17). Callers pass the catalogued action code.
export const recordBackOfficeAudit = (
  transaction: Prisma.TransactionClient,
  actor: BackOfficeActor,
  record: {
    actionCode: string;
    targetType: 'salary_payment' | 'expense';
    targetId: string;
    branchId: string | null;
    metadata: Prisma.InputJsonObject;
    occurredAt: Date;
  },
) =>
  transaction.auditRecord.create({
    data: {
      actionCode: record.actionCode,
      outcome: AuditOutcome.SUCCEEDED,
      actorKind: AuditActorKind.ACCOUNT,
      actorAccountId: actor.accountId,
      actorRole: StaffRole.ADMINISTRATOR,
      targetType: record.targetType,
      targetId: record.targetId,
      branchId: record.branchId,
      correlationId: randomUUID(),
      metadata: record.metadata,
      occurredAt: record.occurredAt,
    },
  });

// Bolivia civil dates travel as UTC midnight; audit metadata stores YYYY-MM-DD.
export const civilText = (date: Date): string =>
  date.toISOString().slice(0, 10);
