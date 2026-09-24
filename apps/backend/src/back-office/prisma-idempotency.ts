import { runIdempotent as runIdempotentShared } from '../database/run-idempotent';
import type { Prisma, PrismaClient } from '../generated/prisma/client';
import { BackOfficeError } from './back-office-errors';

// Back Office's view of the shared helper: a reused key answers with its own
// error code (moved to `src/database` when the Promotions gained a second use).
export const runIdempotent = <Response extends Prisma.InputJsonObject>(
  prisma: PrismaClient,
  record: {
    accountId: string;
    command: string;
    idempotencyKey: string;
    request: unknown;
    now: () => Date;
  },
  work: (transaction: Prisma.TransactionClient) => Promise<Response>,
): Promise<Response> =>
  runIdempotentShared(
    prisma,
    {
      ...record,
      onKeyReused: () => new BackOfficeError('idempotency_key_reused'),
    },
    work,
  );
