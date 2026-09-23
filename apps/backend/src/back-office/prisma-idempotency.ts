import { createHash } from 'node:crypto';
import type { Prisma, PrismaClient } from '../generated/prisma/client';
import { BackOfficeError } from './back-office-errors';

type Transaction = Prisma.TransactionClient;

// ADR-0060 replay window for lost responses, as for PAY-001 and NUT-002.
const idempotencyRetentionMilliseconds = 48 * 60 * 60 * 1_000;

const hashRequest = (request: unknown): Uint8Array<ArrayBuffer> =>
  new Uint8Array(createHash('sha256').update(JSON.stringify(request)).digest());

// Runs one Read Committed transaction that either replays the stored response
// for this Account, command, and key or does the work and stores its response.
// A transaction-scoped advisory lock on the key makes a concurrent request with
// the same key wait for the first to commit and then replay its response.
export const runIdempotent = async <Response extends Prisma.InputJsonObject>(
  prisma: PrismaClient,
  record: {
    accountId: string;
    command: string;
    idempotencyKey: string;
    request: unknown;
    now: () => Date;
  },
  work: (transaction: Transaction) => Promise<Response>,
): Promise<Response> => {
  const requestHash = hashRequest(record.request);
  const lockKey = `${record.accountId}:${record.command}:${record.idempotencyKey}`;
  return prisma.$transaction(async (transaction) => {
    await transaction.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${lockKey}, 0))`;
    const existing = await transaction.idempotencyRecord.findUnique({
      where: {
        accountId_command_idempotencyKey: {
          accountId: record.accountId,
          command: record.command,
          idempotencyKey: record.idempotencyKey,
        },
      },
      select: { requestHash: true, responseBody: true },
    });
    if (existing !== null) {
      if (!Buffer.from(existing.requestHash).equals(Buffer.from(requestHash))) {
        throw new BackOfficeError('idempotency_key_reused');
      }
      return existing.responseBody as Response;
    }
    const response = await work(transaction);
    const createdAt = record.now();
    await transaction.idempotencyRecord.create({
      data: {
        accountId: record.accountId,
        command: record.command,
        idempotencyKey: record.idempotencyKey,
        requestHash,
        responseStatus: 201,
        responseBody: response,
        createdAt,
        expiresAt: new Date(
          createdAt.getTime() + idempotencyRetentionMilliseconds,
        ),
      },
    });
    return response;
  });
};
