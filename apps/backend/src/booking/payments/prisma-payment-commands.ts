import { createHash } from 'node:crypto';
import type { Prisma } from '../../generated/prisma/client';
import {
  CreditLedgerActorKind,
  CreditLedgerEntryKind,
  PrismaClient,
  PurchaseIntentState,
  SubscriptionState,
} from '../../generated/prisma/client';
import { toPrismaBytes } from '../../database/prisma-bytes';
import { retrySerializable } from '../../database/retry-serializable';
import type { AuthenticatedPrincipal } from '../../system-identity/authentication/resolve-authenticated-principal';
import { boliviaDate } from '../../time/bolivia-time';
import { BookingAccessDeniedError } from '../commands/create-booking';
import { summarizeCredit, type CreditSummary } from './credit-summary';
import { PaymentRuleError } from './payment-errors';
import { evaluatePurchaseEligibility } from './purchase-eligibility';

type Transaction = Prisma.TransactionClient;

export type PurchaseIntentView = {
  id: string;
  planId: string;
  planName: string;
  durationMonths: number;
  classAllowance: number;
  planPriceCentavos: number;
  creditReservedCentavos: number;
  amountDueCentavos: number;
  state: 'open' | 'submitted' | 'expired';
  receiptAttached: boolean;
  createdAt: Date;
  expiresAt: Date;
};

export type PaymentCommandsDependencies = {
  now: () => Date;
  referralRewardCentavos: number;
};

const hourMilliseconds = 60 * 60 * 1_000;
const purchaseIntentLifetimeMilliseconds = 24 * hourMilliseconds;
// Retained at least 48 hours after the Intent's 24-hour lifetime ends.
const idempotencyRetentionMilliseconds = 72 * hourMilliseconds;

const intentStates: Record<PurchaseIntentState, PurchaseIntentView['state']> =
  {
    [PurchaseIntentState.OPEN]: 'open',
    [PurchaseIntentState.SUBMITTED]: 'submitted',
    [PurchaseIntentState.EXPIRED]: 'expired',
  };

const intentSelect = {
  id: true,
  planId: true,
  planNameSnapshot: true,
  durationMonthsSnapshot: true,
  classAllowanceSnapshot: true,
  planPriceCentavos: true,
  creditReservedCentavos: true,
  amountDueCentavos: true,
  receiptImageAssetId: true,
  state: true,
  createdAt: true,
  expiresAt: true,
} as const;

type IntentRow = Prisma.PurchaseIntentGetPayload<{ select: typeof intentSelect }>;

const toIntentView = (row: IntentRow): PurchaseIntentView => ({
  id: row.id,
  planId: row.planId,
  planName: row.planNameSnapshot,
  durationMonths: row.durationMonthsSnapshot,
  classAllowance: row.classAllowanceSnapshot,
  planPriceCentavos: row.planPriceCentavos,
  creditReservedCentavos: row.creditReservedCentavos,
  amountDueCentavos: row.amountDueCentavos,
  state: intentStates[row.state],
  receiptAttached: row.receiptImageAssetId !== null,
  createdAt: row.createdAt,
  expiresAt: row.expiresAt,
});

const requireClient = (principal: AuthenticatedPrincipal): string => {
  if (principal.identity.kind !== 'client') {
    throw new BookingAccessDeniedError();
  }
  return principal.identity.clientId;
};

const isUniqueViolation = (error: unknown): boolean =>
  typeof error === 'object' &&
  error !== null &&
  'code' in error &&
  error.code === 'P2002';

const hashRequest = (request: unknown): Uint8Array<ArrayBuffer> =>
  toPrismaBytes(createHash('sha256').update(JSON.stringify(request)).digest());

export function createPrismaPaymentCommands(
  prisma: PrismaClient,
  dependencies: PaymentCommandsDependencies,
) {
  const serializable = <Result>(
    work: (transaction: Transaction) => Promise<Result>,
  ): Promise<Result> =>
    retrySerializable(() =>
      prisma.$transaction(work, { isolationLevel: 'Serializable' }),
    );

  // Client rows are locked in stable UUID order before any money moves.
  const lockClients = async (
    transaction: Transaction,
    clientIds: string[],
  ): Promise<void> => {
    for (const clientId of [...new Set(clientIds)].sort()) {
      await transaction.$queryRaw`SELECT "id" FROM "booking"."clients" WHERE "id" = ${clientId}::uuid FOR UPDATE`;
    }
  };

  const readLedgerSummary = async (
    transaction: Transaction,
    clientId: string,
  ): Promise<CreditSummary> => {
    const entries = await transaction.creditLedgerEntry.findMany({
      where: { clientId },
      select: { kind: true, amountCentavos: true },
    });
    return summarizeCredit(
      entries.map((entry) => ({
        kind: entry.kind.toLowerCase() as Lowercase<CreditLedgerEntryKind>,
        amountCentavos: entry.amountCentavos,
      })),
    );
  };

  const withIdempotency = async <Result extends Prisma.InputJsonValue>(
    transaction: Transaction,
    record: {
      accountId: string;
      command: string;
      idempotencyKey: string;
      request: unknown;
    },
    work: () => Promise<Result>,
  ): Promise<Result> => {
    const requestHash = hashRequest(record.request);
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
      if (
        !Buffer.from(existing.requestHash).equals(Buffer.from(requestHash))
      ) {
        throw new PaymentRuleError(
          'idempotency_key_reused',
          'Idempotency Key was reused with a different request',
        );
      }
      return existing.responseBody as Result;
    }

    const result = await work();
    await transaction.idempotencyRecord.create({
      data: {
        accountId: record.accountId,
        command: record.command,
        idempotencyKey: record.idempotencyKey,
        requestHash,
        responseStatus: 201,
        responseBody: result,
        expiresAt: new Date(
          dependencies.now().getTime() + idempotencyRetentionMilliseconds,
        ),
      },
    });
    return result;
  };

  // Eligibility reloads the effective Subscription, open Intent, pending
  // Payment, and Plan inside the locked transaction; a Subscription that no
  // longer holds is expired here before the new allocation record is created.
  const assertEligible = async (
    transaction: Transaction,
    clientId: string,
    planId: string,
  ) => {
    const now = dependencies.now();
    const today = boliviaDate(now);
    const [plan, active, openIntent, pendingPayment] = await Promise.all([
      transaction.plan.findUnique({
        where: { id: planId },
        select: {
          id: true,
          name: true,
          durationMonths: true,
          classAllowance: true,
          priceCentavos: true,
          hiddenAt: true,
        },
      }),
      transaction.subscription.findFirst({
        where: { clientId, state: SubscriptionState.ACTIVE },
        orderBy: [{ endsOn: 'desc' }, { id: 'desc' }],
        select: {
          id: true,
          endsOn: true,
          remainingClassAllowance: true,
          _count: {
            select: {
              bookings: {
                where: { state: 'BOOKED', session: { startsAt: { gt: now } } },
              },
            },
          },
        },
      }),
      transaction.purchaseIntent.findFirst({
        where: {
          clientId,
          state: PurchaseIntentState.OPEN,
          expiresAt: { gt: now },
        },
        select: { id: true },
      }),
      transaction.payment.findFirst({
        where: { clientId, state: 'PENDING' },
        select: { id: true },
      }),
    ]);

    const eligibility = evaluatePurchaseEligibility({
      today,
      plan,
      activeSubscription:
        active === null
          ? null
          : {
              id: active.id,
              endsOn: active.endsOn,
              remainingClassAllowance: active.remainingClassAllowance,
              futureBookedCount: active._count.bookings,
            },
      openPurchaseIntentId: openIntent?.id ?? null,
      pendingPaymentId: pendingPayment?.id ?? null,
    });

    if (eligibility.subscriptionIdToExpire !== null) {
      await transaction.subscription.update({
        where: { id: eligibility.subscriptionIdToExpire },
        data: { state: SubscriptionState.EXPIRED, expiredAt: now },
      });
    }

    // evaluatePurchaseEligibility has thrown when the Plan is not purchasable.
    return plan!;
  };

  const createPurchaseIntent = async (
    command: { planId: string },
    principal: AuthenticatedPrincipal,
    idempotencyKey: string,
  ): Promise<PurchaseIntentView> => {
    const clientId = requireClient(principal);

    try {
      const stored = await serializable((transaction) =>
        withIdempotency(
          transaction,
          {
            accountId: principal.accountId,
            command: 'create_purchase_intent',
            idempotencyKey,
            request: { planId: command.planId },
          },
          async () => {
            await lockClients(transaction, [clientId]);
            const plan = await assertEligible(
              transaction,
              clientId,
              command.planId,
            );
            const now = dependencies.now();
            const credit = await readLedgerSummary(transaction, clientId);
            const reserved = Math.min(
              credit.availableCentavos,
              plan.priceCentavos,
            );

            const intent = await transaction.purchaseIntent.create({
              data: {
                clientId,
                planId: plan.id,
                planNameSnapshot: plan.name,
                durationMonthsSnapshot: plan.durationMonths,
                classAllowanceSnapshot: plan.classAllowance,
                planPriceCentavos: plan.priceCentavos,
                creditReservedCentavos: reserved,
                amountDueCentavos: plan.priceCentavos - reserved,
                createdByAccountId: principal.accountId,
                createdAt: now,
                expiresAt: new Date(
                  now.getTime() + purchaseIntentLifetimeMilliseconds,
                ),
              },
              select: intentSelect,
            });

            if (reserved > 0) {
              const reservation = await transaction.creditReservation.create({
                data: {
                  clientId,
                  amountCentavos: reserved,
                  purchaseIntentId: intent.id,
                  reservedAt: now,
                },
                select: { id: true },
              });
              await transaction.creditLedgerEntry.create({
                data: {
                  clientId,
                  kind: CreditLedgerEntryKind.PAYMENT_RESERVATION,
                  amountCentavos: reserved,
                  occurredAt: now,
                  reservationId: reservation.id,
                  actorKind: CreditLedgerActorKind.ACCOUNT,
                  actorAccountId: principal.accountId,
                  correlationId: intent.id,
                },
              });
            }

            return { id: intent.id };
          },
        ),
      );

      const intent = await prisma.purchaseIntent.findUniqueOrThrow({
        where: { id: stored.id },
        select: intentSelect,
      });
      return toIntentView(intent);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new PaymentRuleError(
          'purchase_intent_open_exists',
          'An open Purchase Intent already exists',
        );
      }
      throw error;
    }
  };

  const readOpenPurchaseIntent = async (
    principal: AuthenticatedPrincipal,
  ): Promise<PurchaseIntentView | null> => {
    const clientId = requireClient(principal);
    const intent = await prisma.purchaseIntent.findFirst({
      where: {
        clientId,
        state: PurchaseIntentState.OPEN,
        expiresAt: { gt: dependencies.now() },
      },
      select: intentSelect,
    });
    return intent === null ? null : toIntentView(intent);
  };

  const readCreditSummary = (
    principal: AuthenticatedPrincipal,
  ): Promise<CreditSummary> =>
    readLedgerSummary(prisma, requireClient(principal));

  return { createPurchaseIntent, readOpenPurchaseIntent, readCreditSummary };
}

export type PaymentCommands = ReturnType<typeof createPrismaPaymentCommands>;
