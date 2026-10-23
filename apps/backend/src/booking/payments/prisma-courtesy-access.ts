import type { Prisma, PrismaClient } from '../../generated/prisma/client';
import {
  AuditActorKind,
  AuditOutcome,
  PaymentMethod,
  PaymentState,
  PurchaseIntentState,
  SubscriptionState,
} from '../../generated/prisma/client';
import { runIdempotent } from '../../database/run-idempotent';
import {
  recordNotification as defaultNotificationRecorder,
  type NotificationRecorder,
} from '../../notifications/prisma-notification-store';
import { auditActorOf } from '../../system-identity/authentication/audit-actor';
import type { AuthenticatedPrincipal } from '../../system-identity/authentication/resolve-authenticated-principal';
import { boliviaDate } from '../../time/bolivia-time';
import {
  AdministrationError,
  requireAdministrator,
} from '../administration/administration-errors';
import { deprecatedDurationMonths } from '../catalog/plan-validity';
import { courtesyAccessPlan, evaluateCourtesyGrant } from './courtesy-access';
import { PaymentRuleError } from './payment-errors';
import type { PaymentView } from './prisma-payment-commands';
import {
  expireSubscription,
  loadActiveSubscription,
  notifyPaymentConfirmed,
} from './subscription-allocation';

type Transaction = Prisma.TransactionClient;

export type CourtesyAccessDependencies = {
  now: () => Date;
  recordNotification?: NotificationRecorder;
};

const civil = (date: Date): string => date.toISOString().slice(0, 10);

// The hidden «Acceso de prueba» Plan is made on the first grant rather than
// seeded, so it survives the production reset (ADR-0104) without a step.
// BKM-005 stores its catalog validity in days; the chosen end date still
// decides the Subscription.
const findOrCreateCourtesyPlan = async (
  transaction: Transaction,
  now: Date,
) => {
  const select = {
    id: true,
    name: true,
    durationDays: true,
    classAllowance: true,
  } as const;
  const existing = await transaction.plan.findFirst({
    where: {
      name: courtesyAccessPlan.name,
      priceCentavos: 0,
      hiddenAt: { not: null },
    },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    select,
  });
  if (existing !== null) return existing;
  return transaction.plan.create({
    data: { ...courtesyAccessPlan, displayOrder: 0, hiddenAt: now },
    select,
  });
};

// REL-011: only an Administrator grants Courtesy Access. It creates a
// confirmed Bs 0 courtesy Payment and a Subscription of 16 classes from today
// to the chosen date, audits it, and sends the usual «Pago confirmado» push.
// It never qualifies a Referral, because it is not a first real Subscription.
export const createPrismaCourtesyAccess = (
  prisma: PrismaClient,
  dependencies: CourtesyAccessDependencies,
) => {
  const recordNotification =
    dependencies.recordNotification ?? defaultNotificationRecorder;

  const grantInTransaction = async (
    transaction: Transaction,
    command: { clientId: string; endsOn: Date },
    principal: AuthenticatedPrincipal,
  ): Promise<{ paymentId: string }> => {
    const now = dependencies.now();
    // The row lock serializes grants and sales for the same Client.
    const locked = await transaction.$queryRaw<{ id: string }[]>`
      SELECT "id" FROM "booking"."clients"
       WHERE "id" = ${command.clientId}::uuid AND "deleted_at" IS NULL
       FOR UPDATE`;
    const account = await transaction.account.findFirst({
      where: { clientId: command.clientId, deletedAt: null },
      select: { id: true },
    });
    if (locked.length === 0 || account === null) {
      throw new AdministrationError('client_not_found');
    }

    const [active, openIntent, pendingPayment] = await Promise.all([
      loadActiveSubscription(transaction, command.clientId, now),
      transaction.purchaseIntent.findFirst({
        where: {
          clientId: command.clientId,
          state: PurchaseIntentState.OPEN,
          expiresAt: { gt: now },
        },
        select: { id: true },
      }),
      transaction.payment.findFirst({
        where: { clientId: command.clientId, state: PaymentState.PENDING },
        select: { id: true },
      }),
    ]);
    const today = boliviaDate(now);
    const eligibility = evaluateCourtesyGrant({
      today,
      endsOn: command.endsOn,
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

    const plan = await findOrCreateCourtesyPlan(transaction, now);
    const payment = await transaction.payment.create({
      data: {
        clientId: command.clientId,
        planId: plan.id,
        planNameSnapshot: plan.name,
        durationDaysSnapshot: plan.durationDays,
        weeklyClassCapSnapshot: null,
        classAllowanceSnapshot: plan.classAllowance,
        planPriceCentavos: 0,
        creditAppliedCentavos: 0,
        amountDueCentavos: 0,
        method: PaymentMethod.COURTESY,
        state: PaymentState.CONFIRMED,
        submittedByAccountId: principal.accountId,
        submittedAt: now,
        decidedByAccountId: principal.accountId,
        decidedAt: now,
        createdAt: now,
      },
      select: { id: true },
    });
    const subscription = await transaction.subscription.create({
      data: {
        clientId: command.clientId,
        planId: plan.id,
        paymentId: payment.id,
        planNameSnapshot: plan.name,
        durationDaysSnapshot: plan.durationDays,
        weeklyClassCapSnapshot: null,
        originalClassAllowance: plan.classAllowance,
        remainingClassAllowance: plan.classAllowance,
        startsOn: today,
        endsOn: command.endsOn,
        state: SubscriptionState.ACTIVE,
        activatedAt: now,
      },
      select: { id: true },
    });

    const actor = auditActorOf(principal);
    await transaction.auditRecord.create({
      data: {
        actionCode: 'payment.courtesy_granted',
        outcome: AuditOutcome.SUCCEEDED,
        actorKind: AuditActorKind.ACCOUNT,
        actorAccountId: actor.accountId,
        actorRole: actor.role,
        impersonationId: actor.impersonationId,
        targetType: 'payment',
        targetId: payment.id,
        correlationId: payment.id,
        occurredAt: now,
        metadata: {
          method: 'courtesy',
          clientId: command.clientId,
          planId: plan.id,
          classAllowance: plan.classAllowance,
          durationDays: plan.durationDays,
          startsOn: civil(today),
          endsOn: civil(command.endsOn),
        },
      },
    });
    await notifyPaymentConfirmed(recordNotification, transaction, {
      clientId: command.clientId,
      paymentId: payment.id,
      subscriptionId: subscription.id,
      now,
    });
    return { paymentId: payment.id };
  };

  const readView = async (paymentId: string): Promise<PaymentView> => {
    const row = await prisma.payment.findUniqueOrThrow({
      where: { id: paymentId },
      select: {
        id: true,
        planId: true,
        planNameSnapshot: true,
        durationDaysSnapshot: true,
        classAllowanceSnapshot: true,
        planPriceCentavos: true,
        creditAppliedCentavos: true,
        amountDueCentavos: true,
        submittedAt: true,
        decidedAt: true,
        subscription: { select: { id: true } },
      },
    });
    return {
      id: row.id,
      method: 'courtesy',
      state: 'confirmed',
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
      rejectionReason: null,
      subscriptionId: row.subscription?.id ?? null,
    };
  };

  return {
    grant: async (
      command: { clientId: string; endsOn: Date },
      principal: AuthenticatedPrincipal,
      idempotencyKey: string,
    ): Promise<PaymentView> => {
      requireAdministrator(principal);
      const stored = await runIdempotent(
        prisma,
        {
          accountId: principal.accountId,
          command: 'grant_courtesy_access',
          idempotencyKey,
          request: {
            clientId: command.clientId,
            endsOn: civil(command.endsOn),
          },
          now: dependencies.now,
          onKeyReused: () =>
            new PaymentRuleError(
              'idempotency_key_reused',
              'Idempotency Key was reused with a different request',
            ),
        },
        (transaction) => grantInTransaction(transaction, command, principal),
      );
      return readView(stored.paymentId);
    },
  };
};

export type CourtesyAccess = ReturnType<typeof createPrismaCourtesyAccess>;
