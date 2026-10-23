import { createHash } from 'node:crypto';
import type { Prisma } from '../../generated/prisma/client';
import {
  AuditActorKind,
  AuditOutcome,
  CreditLedgerActorKind,
  CreditLedgerEntryKind,
  CreditReservationState,
  ImageAssetPurpose,
  ImageAssetState,
  ImageMediaType,
  PaymentMethod,
  PaymentState,
  PrismaClient,
  PurchaseIntentState,
  ReferralState,
  StaffRole,
  SubscriptionState,
} from '../../generated/prisma/client';
import { toPrismaBytes } from '../../database/prisma-bytes';
import { retrySerializable } from '../../database/retry-serializable';
import {
  recordNotification as defaultNotificationRecorder,
  type NotificationRecorder,
} from '../../notifications/prisma-notification-store';
import { auditActorOf } from '../../system-identity/authentication/audit-actor';
import type { AuthenticatedPrincipal } from '../../system-identity/authentication/resolve-authenticated-principal';
import { boliviaDate } from '../../time/bolivia-time';
import { BookingAccessDeniedError } from '../commands/create-booking';
import { summarizeCredit, type CreditSummary } from './credit-summary';
import { PaymentRuleError } from './payment-errors';
import {
  scheduleReceiptDeletion,
  settleReservation,
} from './purchase-intent-settlement';
import { evaluatePurchaseEligibility } from './purchase-eligibility';
import { deprecatedDurationMonths } from '../catalog/plan-validity';
import { computeSubscriptionTerm } from './subscription-term';
import { grantGiftClass } from './allowance-adjustments';
import {
  collectOwedInviteReward,
  grantInviteReward,
} from './grant-invite-reward';
import { hasEarlierRealPayment } from './gift-class-history';

type Transaction = Prisma.TransactionClient;

export type PurchaseIntentView = {
  id: string;
  planId: string;
  planName: string;
  durationDays: number;
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

export type PaymentView = {
  id: string;
  method: 'transfer' | 'cash' | 'credit_only' | 'courtesy';
  state: 'pending' | 'confirmed' | 'rejected';
  planId: string;
  planName: string;
  durationDays: number;
  durationMonths: number;
  classAllowance: number;
  planPriceCentavos: number;
  creditAppliedCentavos: number;
  amountDueCentavos: number;
  submittedAt: Date;
  decidedAt: Date | null;
  rejectionReason: string | null;
  subscriptionId: string | null;
};

export type CreditActivityEntry = {
  id: string;
  kind:
    | 'referral_award'
    | 'payment_reservation'
    | 'payment_spend'
    | 'payment_release';
  amountCentavos: number;
  occurredAt: Date;
};

export type ReferralsView = {
  referralCode: string;
  referrals: {
    referredClientId: string;
    referredName: string;
    state: 'pending' | 'awarded';
    createdAt: Date;
    awardedAt: Date | null;
    awardCentavos: number | null;
  }[];
};

const creditActivityLimit = 20;

export type PendingPaymentSummary = {
  id: string;
  clientName: string;
  planName: string;
  amountDueCentavos: number;
  submittedAt: Date;
  receiptAvailable: boolean;
};

export type PaymentReview = PaymentView & {
  clientName: string;
  receipt: { imageAssetId: string; mediaType: string } | null;
};

const mediaTypes: Record<ImageMediaType, string> = {
  [ImageMediaType.JPEG]: 'image/jpeg',
  [ImageMediaType.PNG]: 'image/png',
  [ImageMediaType.WEBP]: 'image/webp',
};

const abbreviateName = (name: string): string => {
  const [first, ...rest] = name.trim().split(/\s+/);
  const surname = rest[0];
  return surname ? `${first} ${surname.charAt(0).toUpperCase()}.` : first;
};

export type PaymentCommandsDependencies = {
  now: () => Date;
  referralRewardCentavos: number;
  recordNotification?: NotificationRecorder;
};

const hourMilliseconds = 60 * 60 * 1_000;
const purchaseIntentLifetimeMilliseconds = 24 * hourMilliseconds;
// Retained at least 48 hours after the Intent's 24-hour lifetime ends.
const idempotencyRetentionMilliseconds = 72 * hourMilliseconds;
const rejectionReasonMaxLength = 300;

const intentStates: Record<PurchaseIntentState, PurchaseIntentView['state']> = {
  [PurchaseIntentState.OPEN]: 'open',
  [PurchaseIntentState.SUBMITTED]: 'submitted',
  [PurchaseIntentState.EXPIRED]: 'expired',
};
const paymentMethods: Record<PaymentMethod, PaymentView['method']> = {
  [PaymentMethod.TRANSFER]: 'transfer',
  [PaymentMethod.CASH]: 'cash',
  [PaymentMethod.CREDIT_ONLY]: 'credit_only',
  [PaymentMethod.COURTESY]: 'courtesy',
};
const paymentStates: Record<PaymentState, PaymentView['state']> = {
  [PaymentState.PENDING]: 'pending',
  [PaymentState.CONFIRMED]: 'confirmed',
  [PaymentState.REJECTED]: 'rejected',
};

const intentSelect = {
  id: true,
  clientId: true,
  planId: true,
  planNameSnapshot: true,
  durationDaysSnapshot: true,
  weeklyClassCapSnapshot: true,
  classAllowanceSnapshot: true,
  planPriceCentavos: true,
  creditReservedCentavos: true,
  amountDueCentavos: true,
  receiptImageAssetId: true,
  state: true,
  createdAt: true,
  expiresAt: true,
} as const;

const paymentSelect = {
  id: true,
  clientId: true,
  planId: true,
  purchaseIntentId: true,
  planNameSnapshot: true,
  durationDaysSnapshot: true,
  weeklyClassCapSnapshot: true,
  classAllowanceSnapshot: true,
  planPriceCentavos: true,
  creditAppliedCentavos: true,
  amountDueCentavos: true,
  method: true,
  state: true,
  submittedAt: true,
  decidedAt: true,
  rejectionReason: true,
  subscription: { select: { id: true } },
  plan: { select: { hiddenAt: true } },
} as const;

type IntentRow = Prisma.PurchaseIntentGetPayload<{
  select: typeof intentSelect;
}>;
type PaymentRow = Prisma.PaymentGetPayload<{ select: typeof paymentSelect }>;

const toIntentView = (row: IntentRow): PurchaseIntentView => ({
  id: row.id,
  planId: row.planId,
  planName: row.planNameSnapshot,
  durationDays: row.durationDaysSnapshot,
  durationMonths: deprecatedDurationMonths(row.durationDaysSnapshot),
  classAllowance: row.classAllowanceSnapshot,
  planPriceCentavos: row.planPriceCentavos,
  creditReservedCentavos: row.creditReservedCentavos,
  amountDueCentavos: row.amountDueCentavos,
  state: intentStates[row.state],
  receiptAttached: row.receiptImageAssetId !== null,
  createdAt: row.createdAt,
  expiresAt: row.expiresAt,
});

const toPaymentView = (row: PaymentRow): PaymentView => ({
  id: row.id,
  method: paymentMethods[row.method],
  state: paymentStates[row.state],
  planId: row.planId,
  planName: row.planNameSnapshot,
  durationDays: row.durationDaysSnapshot,
  durationMonths: deprecatedDurationMonths(row.durationDaysSnapshot),
  classAllowance: row.classAllowanceSnapshot,
  planPriceCentavos: row.planPriceCentavos,
  creditAppliedCentavos: row.creditAppliedCentavos,
  amountDueCentavos: row.amountDueCentavos,
  submittedAt: row.submittedAt,
  decidedAt: row.decidedAt,
  rejectionReason: row.rejectionReason,
  subscriptionId: row.subscription?.id ?? null,
});

const requireClient = (principal: AuthenticatedPrincipal): string => {
  if (principal.identity.kind !== 'client') {
    throw new BookingAccessDeniedError();
  }
  return principal.identity.clientId;
};

const requireAdministrator = (principal: AuthenticatedPrincipal): void => {
  if (
    principal.identity.kind !== 'staff' ||
    principal.identity.role !== 'administrator'
  ) {
    throw new BookingAccessDeniedError();
  }
};

const isUniqueViolation = (error: unknown): boolean =>
  typeof error === 'object' &&
  error !== null &&
  'code' in error &&
  error.code === 'P2002';

const hashRequest = (request: unknown): Uint8Array<ArrayBuffer> =>
  toPrismaBytes(createHash('sha256').update(JSON.stringify(request)).digest());

const rule = (code: PaymentRuleError['code'], message: string) =>
  new PaymentRuleError(code, message);

const normalizeRejectionReason = (reason: string): string => {
  const normalized = reason.trim();
  if (normalized.length === 0 || normalized.length > rejectionReasonMaxLength) {
    throw new Error('Rejection reason is required');
  }
  return normalized;
};

export function createPrismaPaymentCommands(
  prisma: PrismaClient,
  dependencies: PaymentCommandsDependencies,
) {
  const recordNotification =
    dependencies.recordNotification ?? defaultNotificationRecorder;

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
    const existing = await transaction.idempotencyRecord.findFirst({
      where: {
        accountId: record.accountId,
        command: record.command,
        idempotencyKey: record.idempotencyKey,
        deletedAt: null,
      },
      select: { requestHash: true, responseBody: true },
    });

    if (existing !== null) {
      if (!Buffer.from(existing.requestHash).equals(Buffer.from(requestHash))) {
        throw rule(
          'idempotency_key_reused',
          'Idempotency Key was reused with a different request',
        );
      }
      return existing.responseBody as Result;
    }

    const result = await work();
    const createdAt = dependencies.now();
    await transaction.idempotencyRecord.create({
      data: {
        accountId: record.accountId,
        command: record.command,
        idempotencyKey: record.idempotencyKey,
        requestHash,
        responseStatus: 201,
        responseBody: result,
        createdAt,
        expiresAt: new Date(
          createdAt.getTime() + idempotencyRetentionMilliseconds,
        ),
      },
    });
    return result;
  };

  const loadActiveSubscription = async (
    transaction: Transaction,
    clientId: string,
    now: Date,
  ) => {
    const active = await transaction.subscription.findFirst({
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
    });
    return active === null
      ? null
      : {
          id: active.id,
          endsOn: active.endsOn,
          remainingClassAllowance: active.remainingClassAllowance,
          futureBookedCount: active._count.bookings,
        };
  };

  const expireSubscription = (
    transaction: Transaction,
    subscriptionId: string,
    now: Date,
  ) =>
    transaction.subscription.update({
      where: { id: subscriptionId },
      data: { state: SubscriptionState.EXPIRED, expiredAt: now },
    });

  // Eligibility reloads the effective Subscription, open Intent, pending
  // Payment, and Plan inside the locked transaction; a Subscription that no
  // longer holds is expired here before the new allocation record is created.
  const assertEligible = async (
    transaction: Transaction,
    input: {
      clientId: string;
      planId: string;
      ignorePurchaseIntentId?: string;
      ignorePaymentId?: string;
    },
  ) => {
    const now = dependencies.now();
    const [plan, active, openIntent, pendingPayment] = await Promise.all([
      transaction.plan.findUnique({
        where: { id: input.planId },
        select: {
          id: true,
          name: true,
          durationDays: true,
          weeklyClassCap: true,
          classAllowance: true,
          priceCentavos: true,
          hiddenAt: true,
        },
      }),
      loadActiveSubscription(transaction, input.clientId, now),
      transaction.purchaseIntent.findFirst({
        where: {
          clientId: input.clientId,
          state: PurchaseIntentState.OPEN,
          expiresAt: { gt: now },
          ...(input.ignorePurchaseIntentId
            ? { id: { not: input.ignorePurchaseIntentId } }
            : {}),
        },
        select: { id: true },
      }),
      transaction.payment.findFirst({
        where: {
          clientId: input.clientId,
          state: PaymentState.PENDING,
          ...(input.ignorePaymentId
            ? { id: { not: input.ignorePaymentId } }
            : {}),
        },
        select: { id: true },
      }),
    ]);

    const eligibility = evaluatePurchaseEligibility({
      today: boliviaDate(now),
      plan,
      activeSubscription: active,
      openPurchaseIntentId: openIntent?.id ?? null,
      pendingPaymentId: pendingPayment?.id ?? null,
    });

    if (eligibility.subscriptionIdToExpire !== null) {
      await expireSubscription(
        transaction,
        eligibility.subscriptionIdToExpire,
        now,
      );
    }

    // evaluatePurchaseEligibility has thrown when the Plan is not purchasable.
    return plan!;
  };

  const loadOwnedIntent = async (
    transaction: Transaction,
    purchaseIntentId: string,
    clientId: string,
  ): Promise<IntentRow> => {
    const intent = await transaction.purchaseIntent.findFirst({
      where: { id: purchaseIntentId, clientId },
      select: intentSelect,
    });
    if (intent === null) {
      throw rule('purchase_intent_not_found', 'Purchase Intent not found');
    }
    if (intent.state !== PurchaseIntentState.OPEN) {
      throw rule('purchase_intent_not_open', 'Purchase Intent is settled');
    }
    if (intent.expiresAt.getTime() <= dependencies.now().getTime()) {
      throw rule('purchase_intent_expired', 'Purchase Intent has expired');
    }
    return intent;
  };

  const recordPaymentAudit = (
    transaction: Transaction,
    input: {
      actionCode: string;
      principal: AuthenticatedPrincipal;
      payment: PaymentRow;
      priorState: PaymentView['state'] | null;
      newState: PaymentView['state'];
      branchId?: string | null;
      now: Date;
    },
  ) => {
    const actor = auditActorOf(input.principal);
    return transaction.auditRecord.create({
      data: {
        actionCode: input.actionCode,
        outcome: AuditOutcome.SUCCEEDED,
        actorKind: AuditActorKind.ACCOUNT,
        actorAccountId: actor.accountId,
        actorRole: actor.role,
        impersonationId: actor.impersonationId,
        targetType: 'payment',
        targetId: input.payment.id,
        branchId: input.branchId ?? null,
        correlationId: input.payment.id,
        occurredAt: input.now,
        metadata: {
          method: paymentMethods[input.payment.method],
          priorState: input.priorState,
          newState: input.newState,
          amountDueCentavos: input.payment.amountDueCentavos,
          creditAppliedCentavos: input.payment.creditAppliedCentavos,
        },
      },
    });
  };

  // A confirmed Payment activates exactly one Subscription and qualifies the
  // Client's pending Referral, awarding the referrer once.
  const activateSubscription = async (
    transaction: Transaction,
    payment: PaymentRow,
    principal: AuthenticatedPrincipal,
    now: Date,
  ): Promise<string> => {
    const term = computeSubscriptionTerm(
      boliviaDate(now),
      payment.durationDaysSnapshot,
    );
    const subscription = await transaction.subscription.create({
      data: {
        clientId: payment.clientId,
        planId: payment.planId,
        paymentId: payment.id,
        planNameSnapshot: payment.planNameSnapshot,
        durationDaysSnapshot: payment.durationDaysSnapshot,
        weeklyClassCapSnapshot: payment.weeklyClassCapSnapshot,
        originalClassAllowance: payment.classAllowanceSnapshot,
        remainingClassAllowance: payment.classAllowanceSnapshot,
        startsOn: term.startsOn,
        endsOn: term.endsOn,
        state: SubscriptionState.ACTIVE,
        activatedAt: now,
      },
      select: { id: true },
    });

    const referral = await transaction.referral.findFirst({
      where: {
        referredClientId: payment.clientId,
        state: ReferralState.PENDING,
      },
      select: { id: true, referrerClientId: true },
    });
    if (referral !== null) {
      await transaction.referral.update({
        where: { id: referral.id },
        data: {
          state: ReferralState.AWARDED,
          qualifiedPaymentId: payment.id,
          qualifiedAt: now,
          awardCentavos: dependencies.referralRewardCentavos,
          awardedAt: now,
        },
      });
      await transaction.creditLedgerEntry.create({
        data: {
          clientId: referral.referrerClientId,
          kind: CreditLedgerEntryKind.REFERRAL_AWARD,
          amountCentavos: dependencies.referralRewardCentavos,
          occurredAt: now,
          referralId: referral.id,
          actorKind: CreditLedgerActorKind.ACCOUNT,
          actorAccountId: principal.accountId,
          correlationId: payment.id,
        },
      });
    }

    await collectOwedInviteReward(transaction, {
      hostClientId: payment.clientId,
      subscriptionId: subscription.id,
      author: {
        accountId: principal.accountId,
        role: auditActorOf(principal).role,
      },
      now,
      correlationId: payment.id,
    });
    await grantInviteReward(transaction, {
      friendClientId: payment.clientId,
      author: {
        accountId: principal.accountId,
        role: auditActorOf(principal).role,
      },
      now,
      correlationId: payment.id,
    });

    await grantGiftClass(transaction, {
      clientId: payment.clientId,
      subscriptionId: subscription.id,
      paymentId: payment.id,
      method: paymentMethods[payment.method],
      hidden: payment.plan.hiddenAt !== null,
      priceCentavos: payment.planPriceCentavos,
      // BKM-010 makes the Founder Membership real; until then nobody is one.
      founder: false,
      earlierRealPayment: await hasEarlierRealPayment(transaction, {
        clientId: payment.clientId,
        paymentId: payment.id,
      }),
      authorAccountId: principal.accountId,
      authorRole: auditActorOf(principal).role,
      now,
    });

    return subscription.id;
  };

  const notifyPaymentConfirmed = async (
    transaction: Transaction,
    input: {
      clientId: string;
      paymentId: string;
      subscriptionId: string;
      now: Date;
    },
  ): Promise<void> => {
    const client = await transaction.client.findUniqueOrThrow({
      where: { id: input.clientId },
      select: { account: { select: { id: true } } },
    });
    if (client.account === null) return;
    await recordNotification(transaction, {
      accountId: client.account.id,
      category: 'subscription_payment',
      type: 'payment_confirmed',
      businessEventKey: `payment-confirmed:${input.paymentId}`,
      title: 'Pago confirmado',
      message: 'Tu pago fue confirmado. ¡Ya puedes reservar clases!',
      destination: { type: 'subscription', id: input.subscriptionId },
      occurredAt: input.now,
    });
  };

  const requireCashCollector = (
    principal: AuthenticatedPrincipal,
    branchId: string,
  ): void => {
    if (
      principal.identity.kind !== 'staff' ||
      (principal.identity.role !== 'assistant' &&
        principal.identity.role !== 'administrator')
    ) {
      throw new BookingAccessDeniedError();
    }
    if (
      principal.identity.role === 'assistant' &&
      !principal.identity.branchIds.includes(branchId)
    ) {
      throw rule(
        'branch_not_assigned',
        'Branch is not assigned to this Staff Member',
      );
    }
  };

  // Cash and Credit-only Payments are created confirmed by their submitter:
  // Credit is reserved and spent in the same transaction, the Subscription
  // activates, and any pending Referral is awarded.
  const settleImmediatePayment = async (
    transaction: Transaction,
    input: {
      clientId: string;
      planId: string;
      principal: AuthenticatedPrincipal;
      branchId: string | null;
      requireFullCredit: boolean;
    },
  ): Promise<{ id: string }> => {
    const now = dependencies.now();
    const referral = await transaction.referral.findFirst({
      where: { referredClientId: input.clientId, state: ReferralState.PENDING },
      select: { referrerClientId: true },
    });
    await lockClients(transaction, [
      input.clientId,
      ...(referral ? [referral.referrerClientId] : []),
    ]);
    const plan = await assertEligible(transaction, {
      clientId: input.clientId,
      planId: input.planId,
    });
    const credit = await readLedgerSummary(transaction, input.clientId);
    if (
      input.requireFullCredit &&
      credit.availableCentavos < plan.priceCentavos
    ) {
      throw rule('credit_insufficient', 'Credit does not cover the Plan price');
    }
    const applied = Math.min(credit.availableCentavos, plan.priceCentavos);
    const amountDue = plan.priceCentavos - applied;
    const method =
      amountDue === 0 ? PaymentMethod.CREDIT_ONLY : PaymentMethod.CASH;

    const payment = await transaction.payment.create({
      data: {
        clientId: input.clientId,
        planId: plan.id,
        planNameSnapshot: plan.name,
        durationDaysSnapshot: plan.durationDays,
        weeklyClassCapSnapshot: plan.weeklyClassCap,
        classAllowanceSnapshot: plan.classAllowance,
        planPriceCentavos: plan.priceCentavos,
        creditAppliedCentavos: applied,
        amountDueCentavos: amountDue,
        method,
        state: PaymentState.CONFIRMED,
        collectedAtBranchId:
          method === PaymentMethod.CASH ? input.branchId : null,
        submittedByAccountId: input.principal.accountId,
        submittedAt: now,
        decidedByAccountId: input.principal.accountId,
        decidedAt: now,
        createdAt: now,
      },
      select: paymentSelect,
    });

    if (applied > 0) {
      const reservation = await transaction.creditReservation.create({
        data: {
          clientId: input.clientId,
          amountCentavos: applied,
          paymentId: payment.id,
          state: CreditReservationState.SPENT,
          reservedAt: now,
          settledAt: now,
        },
        select: { id: true },
      });
      for (const kind of [
        CreditLedgerEntryKind.PAYMENT_RESERVATION,
        CreditLedgerEntryKind.PAYMENT_SPEND,
      ]) {
        await transaction.creditLedgerEntry.create({
          data: {
            clientId: input.clientId,
            kind,
            amountCentavos: applied,
            occurredAt: now,
            reservationId: reservation.id,
            actorKind: CreditLedgerActorKind.ACCOUNT,
            actorAccountId: input.principal.accountId,
            correlationId: payment.id,
          },
        });
      }
    }

    const subscriptionId = await activateSubscription(
      transaction,
      payment,
      input.principal,
      now,
    );
    await recordPaymentAudit(transaction, {
      actionCode:
        method === PaymentMethod.CASH
          ? 'payment.cash_confirmed'
          : 'payment.credit_only_confirmed',
      principal: input.principal,
      payment,
      priorState: null,
      newState: 'confirmed',
      branchId: method === PaymentMethod.CASH ? input.branchId : null,
      now,
    });
    await notifyPaymentConfirmed(transaction, {
      clientId: input.clientId,
      paymentId: payment.id,
      subscriptionId,
      now,
    });

    return { id: payment.id };
  };

  const recordCashPayment = async (
    command: { clientId: string; planId: string; branchId: string },
    principal: AuthenticatedPrincipal,
    idempotencyKey: string,
  ): Promise<PaymentView> => {
    requireCashCollector(principal, command.branchId);

    const stored = await serializable((transaction) =>
      withIdempotency(
        transaction,
        {
          accountId: principal.accountId,
          command: 'record_cash_payment',
          idempotencyKey,
          request: command,
        },
        () =>
          settleImmediatePayment(transaction, {
            clientId: command.clientId,
            planId: command.planId,
            principal,
            branchId: command.branchId,
            requireFullCredit: false,
          }),
      ),
    );

    return readPaymentView(stored.id);
  };

  const completeCreditPurchase = async (
    command: { planId: string },
    principal: AuthenticatedPrincipal,
    idempotencyKey: string,
  ): Promise<PaymentView> => {
    const clientId = requireClient(principal);

    const stored = await serializable((transaction) =>
      withIdempotency(
        transaction,
        {
          accountId: principal.accountId,
          command: 'complete_credit_purchase',
          idempotencyKey,
          request: command,
        },
        () =>
          settleImmediatePayment(transaction, {
            clientId,
            planId: command.planId,
            principal,
            branchId: null,
            requireFullCredit: true,
          }),
      ),
    );

    return readPaymentView(stored.id);
  };

  const readPaymentView = async (paymentId: string): Promise<PaymentView> =>
    toPaymentView(
      await prisma.payment.findUniqueOrThrow({
        where: { id: paymentId },
        select: paymentSelect,
      }),
    );

  const readIntentView = async (
    intentId: string,
  ): Promise<PurchaseIntentView> =>
    toIntentView(
      await prisma.purchaseIntent.findUniqueOrThrow({
        where: { id: intentId },
        select: intentSelect,
      }),
    );

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
            const plan = await assertEligible(transaction, {
              clientId,
              planId: command.planId,
            });
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
                durationDaysSnapshot: plan.durationDays,
                weeklyClassCapSnapshot: plan.weeklyClassCap,
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
              select: { id: true },
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

      return readIntentView(stored.id);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw rule(
          'purchase_intent_open_exists',
          'An open Purchase Intent already exists',
        );
      }
      throw error;
    }
  };

  const attachReceipt = async (
    command: { purchaseIntentId: string; imageAssetId: string },
    principal: AuthenticatedPrincipal,
    idempotencyKey: string,
  ): Promise<PurchaseIntentView> => {
    const clientId = requireClient(principal);

    const stored = await serializable((transaction) =>
      withIdempotency(
        transaction,
        {
          accountId: principal.accountId,
          command: 'attach_receipt',
          idempotencyKey,
          request: command,
        },
        async () => {
          await lockClients(transaction, [clientId]);
          const now = dependencies.now();
          const intent = await loadOwnedIntent(
            transaction,
            command.purchaseIntentId,
            clientId,
          );
          const asset = await transaction.imageAsset.findUnique({
            where: { id: command.imageAssetId },
            select: {
              id: true,
              ownerAccountId: true,
              purpose: true,
              state: true,
            },
          });
          if (
            asset === null ||
            asset.ownerAccountId !== principal.accountId ||
            asset.purpose !== ImageAssetPurpose.TRANSFER_RECEIPT
          ) {
            throw rule(
              'payment_receipt_invalid_owner',
              'Receipt does not belong to this Account',
            );
          }
          if (intent.receiptImageAssetId === asset.id) {
            return { id: intent.id };
          }
          if (asset.state !== ImageAssetState.READY) {
            throw rule('payment_receipt_not_ready', 'Receipt is not ready');
          }

          if (intent.receiptImageAssetId !== null) {
            await transaction.imageAsset.update({
              where: { id: intent.receiptImageAssetId },
              data: {
                state: ImageAssetState.READY,
                attachedAt: null,
                deletionDueAt: now,
              },
            });
          }
          await transaction.purchaseIntent.update({
            where: { id: intent.id },
            data: { receiptImageAssetId: asset.id },
          });
          await transaction.imageAsset.update({
            where: { id: asset.id },
            data: {
              state: ImageAssetState.ATTACHED,
              attachedAt: now,
              deletionDueAt: null,
            },
          });

          return { id: intent.id };
        },
      ),
    );

    return readIntentView(stored.id);
  };

  const notifyAdministrators = async (
    transaction: Transaction,
    paymentId: string,
    now: Date,
  ): Promise<void> => {
    const administrators = await transaction.account.findMany({
      where: {
        activatedAt: { not: null },
        disabledAt: null,
        staffMember: { role: StaffRole.ADMINISTRATOR },
      },
      select: { id: true },
    });
    for (const administrator of administrators) {
      await recordNotification(transaction, {
        accountId: administrator.id,
        category: 'subscription_payment',
        type: 'payment_submitted',
        businessEventKey: `payment-submitted:${paymentId}`,
        title: 'Comprobante por revisar',
        message: 'Tienes un comprobante de pago pendiente de revisión.',
        destination: { type: 'payment', id: paymentId },
        occurredAt: now,
      });
    }
  };

  const submitTransfer = async (
    command: { purchaseIntentId: string },
    principal: AuthenticatedPrincipal,
    idempotencyKey: string,
  ): Promise<PaymentView> => {
    const clientId = requireClient(principal);

    const stored = await serializable((transaction) =>
      withIdempotency(
        transaction,
        {
          accountId: principal.accountId,
          command: 'submit_transfer',
          idempotencyKey,
          request: command,
        },
        async () => {
          await lockClients(transaction, [clientId]);
          const now = dependencies.now();
          const intent = await loadOwnedIntent(
            transaction,
            command.purchaseIntentId,
            clientId,
          );
          if (intent.receiptImageAssetId === null) {
            throw rule('payment_receipt_required', 'Attach a receipt first');
          }
          await assertEligible(transaction, {
            clientId,
            planId: intent.planId,
            ignorePurchaseIntentId: intent.id,
          });

          const payment = await transaction.payment.create({
            data: {
              clientId,
              planId: intent.planId,
              purchaseIntentId: intent.id,
              planNameSnapshot: intent.planNameSnapshot,
              durationDaysSnapshot: intent.durationDaysSnapshot,
              weeklyClassCapSnapshot: intent.weeklyClassCapSnapshot,
              classAllowanceSnapshot: intent.classAllowanceSnapshot,
              planPriceCentavos: intent.planPriceCentavos,
              creditAppliedCentavos: intent.creditReservedCentavos,
              amountDueCentavos: intent.amountDueCentavos,
              method: PaymentMethod.TRANSFER,
              state: PaymentState.PENDING,
              submittedByAccountId: principal.accountId,
              submittedAt: now,
              createdAt: now,
            },
            select: { id: true },
          });
          await transaction.purchaseIntent.update({
            where: { id: intent.id },
            data: { state: PurchaseIntentState.SUBMITTED, submittedAt: now },
          });
          await notifyAdministrators(transaction, payment.id, now);

          return { id: payment.id };
        },
      ),
    );

    return readPaymentView(stored.id);
  };

  const expirePurchaseIntents = async (): Promise<number> => {
    const now = dependencies.now();
    const due = await prisma.purchaseIntent.findMany({
      where: { state: PurchaseIntentState.OPEN, expiresAt: { lte: now } },
      select: { id: true },
    });
    let expired = 0;

    for (const { id } of due) {
      const changed = await serializable(async (transaction) => {
        const intent = await transaction.purchaseIntent.findUnique({
          where: { id },
          select: intentSelect,
        });
        if (intent === null || intent.state !== PurchaseIntentState.OPEN) {
          return false;
        }
        await lockClients(transaction, [intent.clientId]);
        await transaction.purchaseIntent.update({
          where: { id },
          data: { state: PurchaseIntentState.EXPIRED, expiredAt: now },
        });
        await settleReservation(transaction, {
          purchaseIntentId: id,
          outcome: 'released',
          now,
          actor: { kind: CreditLedgerActorKind.WORKER, accountId: null },
          correlationId: id,
        });
        await scheduleReceiptDeletion(
          transaction,
          intent.receiptImageAssetId,
          now,
          false,
        );
        return true;
      });
      if (changed) expired += 1;
    }

    return expired;
  };

  const loadTransferPayment = async (
    transaction: Transaction,
    paymentId: string,
  ): Promise<PaymentRow> => {
    const payment = await transaction.payment.findUnique({
      where: { id: paymentId },
      select: paymentSelect,
    });
    if (payment === null) {
      throw rule('payment_not_found', 'Payment not found');
    }
    if (payment.method !== PaymentMethod.TRANSFER) {
      throw rule('payment_not_pending', 'Only transfer Payments are reviewed');
    }
    return payment;
  };

  const confirmTransfer = async (
    command: { paymentId: string },
    principal: AuthenticatedPrincipal,
  ): Promise<PaymentView> => {
    requireAdministrator(principal);

    const paymentId = await serializable(async (transaction) => {
      const payment = await loadTransferPayment(transaction, command.paymentId);
      if (payment.state === PaymentState.CONFIRMED) return payment.id;
      if (payment.state === PaymentState.REJECTED) {
        throw rule(
          'payment_confirmation_conflict',
          'Payment was already rejected',
        );
      }

      const now = dependencies.now();
      const referral = await transaction.referral.findFirst({
        where: {
          referredClientId: payment.clientId,
          state: ReferralState.PENDING,
        },
        select: { referrerClientId: true },
      });
      await lockClients(transaction, [
        payment.clientId,
        ...(referral ? [referral.referrerClientId] : []),
      ]);

      const active = await loadActiveSubscription(
        transaction,
        payment.clientId,
        now,
      );
      if (active !== null) {
        const eligibility = (() => {
          try {
            return evaluatePurchaseEligibility({
              today: boliviaDate(now),
              plan: {
                hiddenAt: null,
                priceCentavos: payment.planPriceCentavos,
              },
              activeSubscription: active,
              openPurchaseIntentId: null,
              pendingPaymentId: null,
            });
          } catch {
            throw rule(
              'payment_confirmation_conflict',
              'The Client already has an active Subscription',
            );
          }
        })();
        if (eligibility.subscriptionIdToExpire !== null) {
          await expireSubscription(
            transaction,
            eligibility.subscriptionIdToExpire,
            now,
          );
        }
      }

      await transaction.payment.update({
        where: { id: payment.id },
        data: {
          state: PaymentState.CONFIRMED,
          decidedByAccountId: principal.accountId,
          decidedAt: now,
        },
      });
      await settleReservation(transaction, {
        purchaseIntentId: payment.purchaseIntentId!,
        outcome: 'spent',
        now,
        actor: {
          kind: CreditLedgerActorKind.ACCOUNT,
          accountId: principal.accountId,
        },
        correlationId: payment.id,
      });
      const subscriptionId = await activateSubscription(
        transaction,
        payment,
        principal,
        now,
      );
      await recordPaymentAudit(transaction, {
        actionCode: 'payment.transfer_confirmed',
        principal,
        payment,
        priorState: 'pending',
        newState: 'confirmed',
        now,
      });
      const intent = await transaction.purchaseIntent.findUnique({
        where: { id: payment.purchaseIntentId! },
        select: { receiptImageAssetId: true },
      });
      await scheduleReceiptDeletion(
        transaction,
        intent?.receiptImageAssetId ?? null,
        now,
        true,
      );
      await notifyPaymentConfirmed(transaction, {
        clientId: payment.clientId,
        paymentId: payment.id,
        subscriptionId,
        now,
      });

      return payment.id;
    });

    return readPaymentView(paymentId);
  };

  const rejectTransfer = async (
    command: { paymentId: string; reason: string },
    principal: AuthenticatedPrincipal,
  ): Promise<PaymentView> => {
    requireAdministrator(principal);
    const reason = normalizeRejectionReason(command.reason);

    const paymentId = await serializable(async (transaction) => {
      const payment = await loadTransferPayment(transaction, command.paymentId);
      if (payment.state === PaymentState.REJECTED) {
        if (payment.rejectionReason === reason) return payment.id;
        throw rule(
          'payment_confirmation_conflict',
          'Payment was already rejected with another reason',
        );
      }
      if (payment.state === PaymentState.CONFIRMED) {
        throw rule(
          'payment_confirmation_conflict',
          'Payment was already confirmed',
        );
      }

      const now = dependencies.now();
      await lockClients(transaction, [payment.clientId]);
      await transaction.payment.update({
        where: { id: payment.id },
        data: {
          state: PaymentState.REJECTED,
          decidedByAccountId: principal.accountId,
          decidedAt: now,
          rejectionReason: reason,
        },
      });
      await settleReservation(transaction, {
        purchaseIntentId: payment.purchaseIntentId!,
        outcome: 'released',
        now,
        actor: {
          kind: CreditLedgerActorKind.ACCOUNT,
          accountId: principal.accountId,
        },
        correlationId: payment.id,
      });
      await recordPaymentAudit(transaction, {
        actionCode: 'payment.transfer_rejected',
        principal,
        payment,
        priorState: 'pending',
        newState: 'rejected',
        now,
      });
      const intent = await transaction.purchaseIntent.findUnique({
        where: { id: payment.purchaseIntentId! },
        select: { receiptImageAssetId: true },
      });
      await scheduleReceiptDeletion(
        transaction,
        intent?.receiptImageAssetId ?? null,
        now,
        true,
      );
      const client = await transaction.client.findUniqueOrThrow({
        where: { id: payment.clientId },
        select: { account: { select: { id: true } } },
      });
      if (client.account !== null) {
        const sentence = reason.endsWith('.') ? reason : `${reason}.`;
        await recordNotification(transaction, {
          accountId: client.account.id,
          category: 'subscription_payment',
          type: 'payment_rejected',
          businessEventKey: `payment-rejected:${payment.id}`,
          title: 'Comprobante rechazado',
          message: `Tu comprobante fue rechazado: ${sentence} Sube uno nuevo para activar tu plan.`,
          destination: { type: 'payment', id: payment.id },
          occurredAt: now,
        });
      }

      return payment.id;
    });

    return readPaymentView(paymentId);
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

  const readCurrentPayment = async (
    principal: AuthenticatedPrincipal,
  ): Promise<PaymentView | null> => {
    const clientId = requireClient(principal);
    const payment = await prisma.payment.findFirst({
      where: { clientId },
      orderBy: [{ submittedAt: 'desc' }, { id: 'desc' }],
      select: paymentSelect,
    });
    return payment === null ? null : toPaymentView(payment);
  };

  const readCreditSummary = (
    principal: AuthenticatedPrincipal,
  ): Promise<CreditSummary> =>
    readLedgerSummary(prisma, requireClient(principal));

  const readCreditActivity = async (
    principal: AuthenticatedPrincipal,
  ): Promise<CreditActivityEntry[]> => {
    const entries = await prisma.creditLedgerEntry.findMany({
      where: { clientId: requireClient(principal) },
      orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
      take: creditActivityLimit,
      select: { id: true, kind: true, amountCentavos: true, occurredAt: true },
    });
    return entries.map((entry) => ({
      id: entry.id,
      kind: entry.kind.toLowerCase() as CreditActivityEntry['kind'],
      amountCentavos: entry.amountCentavos,
      occurredAt: entry.occurredAt,
    }));
  };

  // Referred Clients appear as first name plus surname initial only.
  const readReferrals = async (
    principal: AuthenticatedPrincipal,
  ): Promise<ReferralsView> => {
    const clientId = requireClient(principal);
    const [client, referrals] = await Promise.all([
      prisma.client.findUniqueOrThrow({
        where: { id: clientId },
        select: { referralCode: true },
      }),
      prisma.referral.findMany({
        where: { referrerClientId: clientId },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        select: {
          state: true,
          createdAt: true,
          awardedAt: true,
          awardCentavos: true,
          referred: { select: { id: true, name: true } },
        },
      }),
    ]);

    return {
      referralCode: client.referralCode,
      referrals: referrals.map((referral) => ({
        referredClientId: referral.referred.id,
        referredName: abbreviateName(referral.referred.name),
        state: referral.state === ReferralState.AWARDED ? 'awarded' : 'pending',
        createdAt: referral.createdAt,
        awardedAt: referral.awardedAt,
        awardCentavos: referral.awardCentavos,
      })),
    };
  };

  // The receipt bytes themselves are read by `prisma-receipt-read.ts`.
  const receiptSelect = {
    id: true,
    deletedAt: true,
    declaredMediaType: true,
    verifiedMediaType: true,
  } as const;
  type ReceiptRow = Prisma.ImageAssetGetPayload<{
    select: typeof receiptSelect;
  }>;
  const receiptOf = (asset: ReceiptRow | null | undefined) =>
    asset && asset.deletedAt === null
      ? {
          imageAssetId: asset.id,
          mediaType:
            mediaTypes[asset.verifiedMediaType ?? asset.declaredMediaType],
        }
      : null;

  const listPendingPayments = async (
    principal: AuthenticatedPrincipal,
  ): Promise<PendingPaymentSummary[]> => {
    requireAdministrator(principal);
    const rows = await prisma.payment.findMany({
      where: { state: PaymentState.PENDING, method: PaymentMethod.TRANSFER },
      orderBy: [{ submittedAt: 'asc' }, { id: 'asc' }],
      select: {
        id: true,
        planNameSnapshot: true,
        amountDueCentavos: true,
        submittedAt: true,
        client: { select: { name: true } },
        purchaseIntent: {
          select: { receiptImageAsset: { select: receiptSelect } },
        },
      },
    });
    return rows.map((row) => ({
      id: row.id,
      clientName: row.client.name,
      planName: row.planNameSnapshot,
      amountDueCentavos: row.amountDueCentavos,
      submittedAt: row.submittedAt,
      receiptAvailable:
        receiptOf(row.purchaseIntent?.receiptImageAsset) !== null,
    }));
  };

  const loadReview = async (paymentId: string) => {
    const row = await prisma.payment.findUnique({
      where: { id: paymentId },
      select: {
        ...paymentSelect,
        client: { select: { name: true } },
        purchaseIntent: {
          select: { receiptImageAsset: { select: receiptSelect } },
        },
      },
    });
    if (row === null) throw rule('payment_not_found', 'Payment not found');
    return row;
  };

  const readPaymentReview = async (
    command: { paymentId: string },
    principal: AuthenticatedPrincipal,
  ): Promise<PaymentReview> => {
    requireAdministrator(principal);
    const row = await loadReview(command.paymentId);
    const receipt = receiptOf(row.purchaseIntent?.receiptImageAsset);
    return {
      ...toPaymentView(row),
      clientName: row.client.name,
      receipt:
        receipt === null
          ? null
          : {
              imageAssetId: receipt.imageAssetId,
              mediaType: receipt.mediaType,
            },
    };
  };

  return {
    createPurchaseIntent,
    attachReceipt,
    listPendingPayments,
    readPaymentReview,
    submitTransfer,
    expirePurchaseIntents,
    confirmTransfer,
    rejectTransfer,
    recordCashPayment,
    completeCreditPurchase,
    readOpenPurchaseIntent,
    readCurrentPayment,
    readCreditSummary,
    readCreditActivity,
    readReferrals,
  };
}

export type PaymentCommands = ReturnType<typeof createPrismaPaymentCommands>;
