import { randomUUID } from 'node:crypto';
import { AuditActorKind, AuditOutcome } from '../../generated/prisma/enums';
import type { Prisma } from '../../generated/prisma/client';
import type {
  AdministratorActor,
  OperationsActor,
} from './administration-errors';

// Catalog and schedule changes (the Administrator's, or the Coordinator's on
// the schedule) are audited in the same
// transaction as the change (ADR-0055). Callers pass the catalogued code.
export const recordAdministratorAudit = (
  transaction: Prisma.TransactionClient,
  actor: AdministratorActor | OperationsActor,
  record: {
    actionCode: string;
    targetType:
      'branch' | 'class_type' | 'plan' | 'session' | 'studio_settings';
    targetId: string;
    branchId?: string;
    metadata: Prisma.InputJsonObject;
    occurredAt: Date;
  },
) =>
  transaction.auditRecord.create({
    data: {
      actionCode: record.actionCode,
      outcome: AuditOutcome.SUCCEEDED,
      actorKind: AuditActorKind.ACCOUNT,
      actorAccountId: actor.audit.accountId,
      actorRole: actor.audit.role,
      impersonationId: actor.audit.impersonationId,
      targetType: record.targetType,
      targetId: record.targetId,
      branchId: record.branchId ?? null,
      correlationId: randomUUID(),
      metadata: record.metadata,
      occurredAt: record.occurredAt,
    },
  });

// Previous and new values of the fields that changed, nothing else.
export const changedValues = <Row extends Record<string, unknown>>(
  previous: Row,
  next: Row,
  fields: readonly (keyof Row & string)[],
): Prisma.InputJsonObject =>
  Object.fromEntries(
    fields
      .filter((field) => previous[field] !== next[field])
      .flatMap((field) => [
        [
          `previous${field[0].toUpperCase()}${field.slice(1)}`,
          previous[field] as Prisma.InputJsonValue,
        ],
        [field, next[field] as Prisma.InputJsonValue],
      ]),
  );
