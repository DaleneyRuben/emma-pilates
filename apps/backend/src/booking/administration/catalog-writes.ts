import { retrySerializable } from '../../database/retry-serializable';
import type { Prisma, PrismaClient } from '../../generated/prisma/client';
import { recordAdministratorAudit } from './administration-audit';
import {
  AdministrationError,
  databaseCause,
  type AdministratorActor,
} from './administration-errors';

export type CatalogTransaction = Prisma.TransactionClient;

const serializable = { isolationLevel: 'Serializable' } as const;

export const trimmed = <Input extends Record<string, unknown>>(
  input: Input,
): Input =>
  Object.fromEntries(
    Object.entries(input).map(([key, value]) => [
      key,
      typeof value === 'string' ? value.trim() : value,
    ]),
  ) as Input;

// Database checks guard every catalog value; their violations map to one code.
const translate = (error: unknown): never => {
  const cause = databaseCause(error);
  if (cause.includes('class_types_active_normalized_name_key')) {
    throw new AdministrationError('class_type_name_taken');
  }
  if (cause.includes('violates check constraint') || cause.includes('23514')) {
    throw new AdministrationError('invalid_catalog_value');
  }
  throw error;
};

// Every catalog write is one serializable transaction, retried on conflict,
// that audits what it changed (ADR-0055).
export const catalogWrites = (
  prisma: PrismaClient,
  dependencies: { now: () => Date },
) => ({
  transact: <Result>(
    work: (transaction: CatalogTransaction) => Promise<Result>,
  ): Promise<Result> =>
    retrySerializable(() => prisma.$transaction(work, serializable)).catch(
      translate,
    ),
  audit: (
    transaction: CatalogTransaction,
    actor: AdministratorActor,
    record: {
      actionCode: string;
      targetType: 'branch' | 'class_type' | 'plan';
      targetId: string;
      branchId?: string;
      metadata?: Prisma.InputJsonObject;
    },
  ) =>
    recordAdministratorAudit(transaction, actor, {
      ...record,
      metadata: record.metadata ?? {},
      occurredAt: dependencies.now(),
    }),
});
