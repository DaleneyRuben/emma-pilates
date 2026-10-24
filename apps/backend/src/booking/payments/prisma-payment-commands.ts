import { createHash } from 'node:crypto';
import type { Prisma } from '../../generated/prisma/client';
import {
  AuditActorKind,
  AuditOutcome,
  CreditLedgerActorKind,
  ImageAssetPurpose,
  ImageAssetState,
  ImageMediaType,
  PaymentKind,
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
import { BookingAccessDeniedError } from '../commands/create-booking';
import { confirmEvaluationTransfer as confirmEvaluationPayment } from '../evaluations/evaluation-payment';
import { createFreezeCommands } from './prisma-freeze';
import { createFreezeReads } from './prisma-freeze-reads';
import {
  allocateStartDate,
  endSubscriptionEarly,
  loadFutureSubscriptionId,
  parseRequestedStartDate,
  readStartDateRules,
  subscriptionTermFor,
  todayOf,
} from './prisma-start-date-allocation';
import type { CreditSummary } from './credit-summary';
import { PaymentRuleError } from './payment-errors';
import {
  intentSelect,
  paymentMethods,
  paymentSelect,
  toIntentView,
  toPaymentView,
  type CreditActivityEntry,
  type IntentRow,
  type PaymentReview,
  type PaymentRow,
  type PaymentView,
  type PendingPaymentSummary,
  type InvitationStatus,
  type PurchaseIntentView,
  type ReferralsView,
} from './payment-views';
import {
  scheduleReceiptDeletion,
  settleReservation,
} from './purchase-intent-settlement';

export type {
  CreditActivityEntry,
  InvitationStatus,
  PaymentReview,
  PaymentView,
  PendingPaymentSummary,
  PurchaseIntentView,
  ReferralsView,
} from './payment-views';
import { invoiceColumns, type InvoiceData } from './invoice-data/invoice-data';
import {
  evaluatePurchaseEligibility,
  isSubscriptionEffective,
} from './purchase-eligibility';
import {
  expireSubscription,
  loadActiveSubscription,
  notifyPaymentConfirmed,
} from './subscription-allocation';

import { grantGiftClass } from './allowance-adjustments';
import { createFrontDeskTransfer } from './front-desk-transfer';
import {
  grantFounderPlace,
  priceFounderSale,
  readIsFounder,
} from './prisma-founder-membership';
import {
  collectOwedInviteReward,
  grantInviteReward,
} from './grant-invite-reward';
import { hasEarlierRealPayment } from './gift-class-history';

type Transaction = Prisma.TransactionClient;

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
  recordNotification?: NotificationRecorder;
};

const hourMilliseconds = 60 * 60 * 1_000;
const purchaseIntentLifetimeMilliseconds = 24 * hourMilliseconds;
// Retained at least 48 hours after the Intent's 24-hour lifetime ends.
const idempotencyRetentionMilliseconds = 72 * hourMilliseconds;
const rejectionReasonMaxLength = 300;

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
  const freezes = createFreezeCommands(prisma, {
    now: dependencies.now,
    recordNotification,
  });
  const freezeReads = createFreezeReads(prisma);

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

    const today = todayOf(now);
    const futureSubscriptionId = await loadFutureSubscriptionId(
      transaction,
      input.clientId,
      today,
    );
    const eligibility = evaluatePurchaseEligibility({
      today,
      plan,
      activeSubscription: active,
      futureSubscriptionId,
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
    return { plan: plan!, active, today };
  };

  const committedStartDate = async (
    transaction: Transaction,
    input: {
      clientId: string;
      requested: Date | null;
      today: Date;
      active: Awaited<ReturnType<typeof loadActiveSubscription>>;
    },
  ) =>
    allocateStartDate({
      today: input.today,
      requested: input.requested,
      rules: await readStartDateRules(transaction),
      active: input.active,
      futureSubscriptionId: await loadFutureSubscriptionId(
        transaction,
        input.clientId,
        input.today,
      ),
    });

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

  // A confirmed Payment activates exactly one Subscription. It awards no
  // Credit: the Bs 60 Referral reward is retired (booking ADR-0009), so a
  // pending Referral stays pending.
  const activateSubscription = async (
    transaction: Transaction,
    payment: PaymentRow,
    principal: AuthenticatedPrincipal,
    now: Date,
  ): Promise<string> => {
    const term = subscriptionTermFor(
      payment.startsOn,
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

    // A pending Referral stays pending. Awarding it requires a Credit ledger
    // entry (booking.referrals_state_fields_check), and Credit is retired
    // (PAY-005). The host's reward is the guest-pass class below.
    const author = {
      accountId: principal.accountId,
      role: auditActorOf(principal).role,
    };
    await collectOwedInviteReward(transaction, {
      hostClientId: payment.clientId,
      subscriptionId: subscription.id,
      author,
      now,
      correlationId: payment.id,
    });
    await grantInviteReward(transaction, {
      friendClientId: payment.clientId,
      author,
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
      founder: await readIsFounder(transaction, payment.clientId),
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

  // A cash Payment is created confirmed by its collector for the full Plan
  // price, and the Subscription activates at once.
  const settleCashPayment = async (
    transaction: Transaction,
    input: {
      clientId: string;
      planId: string;
      startsOn?: string;
      principal: AuthenticatedPrincipal;
      branchId: string;
      invoiceData?: InvoiceData | null;
    },
  ): Promise<{ id: string }> => {
    const now = dependencies.now();
    await lockClients(transaction, [input.clientId]);
    const eligible = await assertEligible(transaction, {
      clientId: input.clientId,
      planId: input.planId,
    });
    const { plan } = eligible;
    const allocated = await committedStartDate(transaction, {
      clientId: input.clientId,
      requested: parseRequestedStartDate(input.startsOn),
      today: eligible.today,
      active: eligible.active,
    });
    const priced = await priceFounderSale(transaction, {
      clientId: input.clientId,
      classAllowance: plan.classAllowance,
      priceCentavos: plan.priceCentavos,
      creditAppliedCentavos: 0,
    });

    const payment = await transaction.payment.create({
      data: {
        clientId: input.clientId,
        planId: plan.id,
        planNameSnapshot: plan.name,
        durationDaysSnapshot: plan.durationDays,
        weeklyClassCapSnapshot: plan.weeklyClassCap,
        classAllowanceSnapshot: plan.classAllowance,
        planPriceCentavos: plan.priceCentavos,
        creditAppliedCentavos: 0,
        discountCentavos: priced.discountCentavos,
        discountReason: priced.discountReason,
        amountDueCentavos: priced.amountDueCentavos,
        startsOn: allocated.startsOn,
        method: PaymentMethod.CASH,
        state: PaymentState.CONFIRMED,
        collectedAtBranchId: input.branchId,
        submittedByAccountId: input.principal.accountId,
        submittedAt: now,
        decidedByAccountId: input.principal.accountId,
        decidedAt: now,
        createdAt: now,
        ...invoiceColumns(input.invoiceData),
      },
      select: paymentSelect,
    });

    if (
      allocated.subscriptionIdToEndEarly !== null &&
      allocated.endsOn !== undefined
    ) {
      await endSubscriptionEarly(transaction, {
        subscriptionId: allocated.subscriptionIdToEndEarly,
        endsOn: allocated.endsOn,
        startsOn: allocated.startsOn,
        principal: input.principal,
        now,
        paymentId: payment.id,
      });
    }
    const subscriptionId = await activateSubscription(
      transaction,
      payment,
      input.principal,
      now,
    );
    await grantFounderPlace(transaction, {
      clientId: input.clientId,
      paymentId: payment.id,
      now,
      courtesy: false,
    });
    await recordPaymentAudit(transaction, {
      actionCode: 'payment.cash_confirmed',
      principal: input.principal,
      payment,
      priorState: null,
      newState: 'confirmed',
      branchId: input.branchId,
      now,
    });
    await notifyPaymentConfirmed(recordNotification, transaction, {
      clientId: input.clientId,
      paymentId: payment.id,
      subscriptionId,
      now,
    });

    return { id: payment.id };
  };

  const recordCashPayment = async (
    command: {
      clientId: string;
      planId: string;
      branchId: string;
      startsOn?: string;
      invoiceData?: InvoiceData | null;
    },
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
          settleCashPayment(transaction, {
            clientId: command.clientId,
            planId: command.planId,
            startsOn: command.startsOn,
            principal,
            branchId: command.branchId,
            invoiceData: command.invoiceData,
          }),
      ),
    );

    return readPaymentView(stored.id);
  };

  // Deprecated with Credit (PAY-005): a store build from before it calls this
  // only when Credit covers the price, which it no longer ever does.
  const completeCreditPurchase = (
    principal: AuthenticatedPrincipal,
  ): Promise<PaymentView> => {
    requireClient(principal);
    return Promise.reject(
      rule('credit_insufficient', 'Credit was retired and covers no Plan'),
    );
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
    command: { planId: string; startsOn?: string },
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
            request: { planId: command.planId, startsOn: command.startsOn },
          },
          async () => {
            await lockClients(transaction, [clientId]);
            const eligible = await assertEligible(transaction, {
              clientId,
              planId: command.planId,
            });
            const { plan } = eligible;
            const allocated = await committedStartDate(transaction, {
              clientId,
              requested: parseRequestedStartDate(command.startsOn),
              today: eligible.today,
              active: eligible.active,
            });
            const now = dependencies.now();
            const priced = await priceFounderSale(transaction, {
              clientId,
              classAllowance: plan.classAllowance,
              priceCentavos: plan.priceCentavos,
              creditAppliedCentavos: 0,
            });

            const intent = await transaction.purchaseIntent.create({
              data: {
                clientId,
                planId: plan.id,
                planNameSnapshot: plan.name,
                durationDaysSnapshot: plan.durationDays,
                weeklyClassCapSnapshot: plan.weeklyClassCap,
                classAllowanceSnapshot: plan.classAllowance,
                planPriceCentavos: plan.priceCentavos,
                creditReservedCentavos: 0,
                discountCentavos: priced.discountCentavos,
                discountReason: priced.discountReason,
                amountDueCentavos: priced.amountDueCentavos,
                startsOn: allocated.startsOn,
                createdByAccountId: principal.accountId,
                createdAt: now,
                expiresAt: new Date(
                  now.getTime() + purchaseIntentLifetimeMilliseconds,
                ),
              },
              select: { id: true },
            });

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
    command: { purchaseIntentId: string; invoiceData?: InvoiceData | null },
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
              discountCentavos: intent.discountCentavos,
              discountReason: intent.discountReason,
              amountDueCentavos: intent.amountDueCentavos,
              startsOn: intent.startsOn,
              method: PaymentMethod.TRANSFER,
              state: PaymentState.PENDING,
              submittedByAccountId: principal.accountId,
              submittedAt: now,
              createdAt: now,
              ...invoiceColumns(command.invoiceData),
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
      if (payment.kind === PaymentKind.EVALUATION) {
        const settings =
          await transaction.studioSettingsVersion.findFirstOrThrow({
            orderBy: { version: 'desc' },
            select: { nutritionistFeeCentavos: true },
          });
        await confirmEvaluationPayment(transaction, {
          paymentId: payment.id,
          principal,
          now: dependencies.now(),
          feeCentavos: settings.nutritionistFeeCentavos,
        });
        return payment.id;
      }
      if (payment.state === PaymentState.CONFIRMED) return payment.id;
      if (payment.state === PaymentState.REJECTED) {
        throw rule(
          'payment_confirmation_conflict',
          'Payment was already rejected',
        );
      }

      const now = dependencies.now();
      await lockClients(transaction, [payment.clientId]);

      const active = await loadActiveSubscription(
        transaction,
        payment.clientId,
        now,
      );
      const today = todayOf(now);
      const allocated = await (async () => {
        try {
          return await committedStartDate(transaction, {
            clientId: payment.clientId,
            requested: payment.startsOn,
            today,
            active,
          });
        } catch (error) {
          if (
            error instanceof PaymentRuleError &&
            error.code === 'future_subscription_exists'
          ) {
            throw rule(
              'payment_confirmation_conflict',
              'The Client already has a future Subscription',
            );
          }
          throw error;
        }
      })();
      if (allocated.startsOn.getTime() !== payment.startsOn.getTime()) {
        throw rule(
          'payment_confirmation_conflict',
          'The committed Start Date no longer matches the renewal',
        );
      }
      if (
        active !== null &&
        active.endsOn.getTime() < today.getTime() &&
        !isSubscriptionEffective(active, today)
      ) {
        await expireSubscription(transaction, active.id, now);
      }
      if (
        allocated.subscriptionIdToEndEarly !== null &&
        allocated.endsOn !== undefined
      ) {
        await endSubscriptionEarly(transaction, {
          subscriptionId: allocated.subscriptionIdToEndEarly,
          endsOn: allocated.endsOn,
          startsOn: allocated.startsOn,
          principal,
          now,
          paymentId: payment.id,
        });
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
      await grantFounderPlace(transaction, {
        clientId: payment.clientId,
        paymentId: payment.id,
        now,
        courtesy: false,
      });
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
      await notifyPaymentConfirmed(recordNotification, transaction, {
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

  // Credit is retired (booking ADR-0009): store builds from before PAY-005
  // still read it, so it reads as zero with no activity; old ledger rows stay.
  const readCreditSummary = (
    principal: AuthenticatedPrincipal,
  ): Promise<CreditSummary> => {
    requireClient(principal);
    return Promise.resolve({ availableCentavos: 0, reservedCentavos: 0 });
  };

  const readCreditActivity = (
    principal: AuthenticatedPrincipal,
  ): Promise<CreditActivityEntry[]> => {
    requireClient(principal);
    return Promise.resolve([]);
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
          referred: {
            select: {
              id: true,
              name: true,
              guestPassesReceived: {
                where: { deletedAt: null },
                select: { bookingId: true, rewardedAt: true, rewardOwed: true },
                take: 1,
              },
            },
          },
        },
      }),
    ]);

    return {
      referralCode: client.referralCode,
      referrals: referrals.map((referral) => {
        const pass = referral.referred.guestPassesReceived[0] ?? null;
        const invitationStatus: InvitationStatus = (() => {
          if (pass === null) return 'registered';
          if (pass.rewardedAt !== null || pass.rewardOwed) return 'bought';
          if (pass.bookingId !== null) return 'class_booked';
          return 'registered';
        })();
        return {
          referredClientId: referral.referred.id,
          referredName: abbreviateName(referral.referred.name),
          state:
            referral.state === ReferralState.AWARDED ? 'awarded' : 'pending',
          invitationStatus,
          createdAt: referral.createdAt,
          awardedAt: referral.awardedAt,
          awardCentavos: referral.awardCentavos,
        };
      }),
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
    requestFreeze: freezes.requestFreeze,
    decideFreeze: freezes.decideFreeze,
    listRequestedFreezes: freezeReads.listRequestedFreezes,
    readFreezeReview: freezeReads.readFreezeReview,
    recordFrontDeskTransfer: (
      command: {
        clientId: string;
        planId: string;
        branchId: string;
        imageAssetId: string;
        startsOn?: string;
      },
      principal: AuthenticatedPrincipal,
      idempotencyKey: string,
    ) =>
      createFrontDeskTransfer(prisma, {
        now: dependencies.now,
        recordNotification,
      })
        .record(command, principal, idempotencyKey)
        .then((stored) => readPaymentView(stored.id)),
    completeCreditPurchase,
    readOpenPurchaseIntent,
    readCurrentPayment,
    readCreditSummary,
    readCreditActivity,
    readReferrals,
  };
}

export type PaymentCommands = ReturnType<typeof createPrismaPaymentCommands>;
