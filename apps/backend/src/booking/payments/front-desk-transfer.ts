import { createHash } from 'node:crypto';
import type { PrismaClient } from '../../generated/prisma/client';
import {
  AuditActorKind,
  AuditOutcome,
  CreditLedgerActorKind,
  CreditLedgerEntryKind,
  ImageAssetPurpose,
  ImageAssetState,
  PaymentKind,
  PaymentMethod,
  PaymentState,
  PurchaseIntentState,
  StaffRole,
} from '../../generated/prisma/client';
import { toPrismaBytes } from '../../database/prisma-bytes';
import { retrySerializable } from '../../database/retry-serializable';
import type { NotificationRecorder } from '../../notifications/prisma-notification-store';
import { recordNotification as defaultNotificationRecorder } from '../../notifications/prisma-notification-store';
import type { AuthenticatedPrincipal } from '../../system-identity/authentication/resolve-authenticated-principal';
import { BookingAccessDeniedError } from '../commands/create-booking';
import { PaymentRuleError } from './payment-errors';
import { createPendingPayment } from './pending-payment';
import { summarizeCredit } from './credit-summary';
import {
  allocateStartDate,
  loadFutureSubscriptionId,
  parseRequestedStartDate,
  readStartDateRules,
  todayOf,
} from './prisma-start-date-allocation';
import { loadActiveSubscription } from './subscription-allocation';
import {
  evaluatePurchaseEligibility,
  isSubscriptionEffective,
} from './purchase-eligibility';
import { priceTransferForGap } from './founder-gap';
import { repointFounderReservation } from './founder-reservation';

const hour = 60 * 60 * 1_000;
const intentLifetime = 24 * hour;
const idempotencyRetention = 72 * hour;

const rule = (code: PaymentRuleError['code'], message: string) =>
  new PaymentRuleError(code, message);

// An Assistant's front-desk QR: the receipt is photographed, the Payment
// stays pending, and the Administrator approves it as an in-app QR
// (decisions §4.2). Cash keeps its own command.
export const createFrontDeskTransfer = (
  prisma: PrismaClient,
  dependencies: { now: () => Date; recordNotification?: NotificationRecorder },
) => {
  const recordNotification =
    dependencies.recordNotification ?? defaultNotificationRecorder;

  const record = async (
    command: {
      clientId: string;
      planId: string;
      branchId: string;
      imageAssetId: string;
      startsOn?: string;
    },
    principal: AuthenticatedPrincipal,
    idempotencyKey: string,
  ): Promise<{ id: string }> => {
    if (
      principal.identity.kind !== 'staff' ||
      (principal.identity.role !== 'assistant' &&
        principal.identity.role !== 'administrator')
    ) {
      throw new BookingAccessDeniedError();
    }
    if (
      principal.identity.role === 'assistant' &&
      !principal.identity.branchIds.includes(command.branchId)
    ) {
      throw rule('branch_not_assigned', 'Branch is not assigned');
    }

    return retrySerializable(() =>
      prisma.$transaction(
        async (transaction) => {
          const replay = await transaction.idempotencyRecord.findFirst({
            where: {
              accountId: principal.accountId,
              command: 'record_front_desk_transfer',
              idempotencyKey,
              deletedAt: null,
            },
            select: { responseBody: true },
          });
          if (replay !== null) return replay.responseBody as { id: string };

          await transaction.$queryRaw`SELECT "id" FROM "booking"."clients" WHERE "id" = ${command.clientId}::uuid FOR UPDATE`;
          const now = dependencies.now();
          const asset = await transaction.imageAsset.findUnique({
            where: { id: command.imageAssetId },
            select: { ownerAccountId: true, purpose: true, state: true },
          });
          if (
            asset === null ||
            asset.ownerAccountId !== principal.accountId ||
            asset.purpose !== ImageAssetPurpose.TRANSFER_RECEIPT
          ) {
            throw rule('payment_receipt_invalid_owner', 'Receipt is not hers');
          }
          if (asset.state !== ImageAssetState.READY) {
            throw rule('payment_receipt_not_ready', 'Receipt is not ready');
          }

          const [plan, active, openIntent, pending] = await Promise.all([
            transaction.plan.findUnique({
              where: { id: command.planId },
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
              where: {
                clientId: command.clientId,
                state: PaymentState.PENDING,
                kind: PaymentKind.PLAN,
              },
              select: { id: true },
            }),
          ]);
          const today = todayOf(now);
          if (active !== null && !isSubscriptionEffective(active, today)) {
            await transaction.subscription.update({
              where: { id: active.id },
              data: { state: 'EXPIRED', expiredAt: now },
            });
          }
          evaluatePurchaseEligibility({
            today,
            plan,
            activeSubscription:
              active !== null && isSubscriptionEffective(active, today)
                ? active
                : null,
            futureSubscriptionId: await loadFutureSubscriptionId(
              transaction,
              command.clientId,
              today,
            ),
            openPurchaseIntentId: openIntent?.id ?? null,
            pendingPaymentId: pending?.id ?? null,
          });
          const allocated = allocateStartDate({
            today,
            requested: parseRequestedStartDate(command.startsOn),
            rules: await readStartDateRules(transaction),
            active:
              active !== null && isSubscriptionEffective(active, today)
                ? active
                : null,
            futureSubscriptionId: await loadFutureSubscriptionId(
              transaction,
              command.clientId,
              today,
            ),
          });
          const entries = await transaction.creditLedgerEntry.findMany({
            where: { clientId: command.clientId },
            select: { kind: true, amountCentavos: true },
          });
          const credit = summarizeCredit(
            entries.map((entry) => ({
              kind: entry.kind.toLowerCase() as Lowercase<CreditLedgerEntryKind>,
              amountCentavos: entry.amountCentavos,
            })),
          );
          const priced = await priceTransferForGap(transaction, {
            clientId: command.clientId,
            nextStart: allocated.startsOn,
            today,
            classAllowance: plan!.classAllowance,
            priceCentavos: plan!.priceCentavos,
            now,
            hidden: plan!.hiddenAt !== null,
          });
          const reserved = Math.min(
            credit.availableCentavos,
            plan!.priceCentavos - priced.discountCentavos,
          );
          const amountDueCentavos =
            plan!.priceCentavos - priced.discountCentavos - reserved;
          const intent = await transaction.purchaseIntent.create({
            data: {
              clientId: command.clientId,
              planId: plan!.id,
              planNameSnapshot: plan!.name,
              durationDaysSnapshot: plan!.durationDays,
              weeklyClassCapSnapshot: plan!.weeklyClassCap,
              classAllowanceSnapshot: plan!.classAllowance,
              planPriceCentavos: plan!.priceCentavos,
              creditReservedCentavos: reserved,
              discountCentavos: priced.discountCentavos,
              discountReason: priced.discountReason,
              amountDueCentavos,
              startsOn: allocated.startsOn,
              receiptImageAssetId: command.imageAssetId,
              state: PurchaseIntentState.SUBMITTED,
              createdByAccountId: principal.accountId,
              createdAt: now,
              expiresAt: new Date(now.getTime() + intentLifetime),
              submittedAt: now,
            },
            select: { id: true },
          });
          if (priced.discountReason === 'founder') {
            await repointFounderReservation(transaction, {
              clientId: command.clientId,
              purchaseIntentId: intent.id,
            });
          }
          if (reserved > 0) {
            const reservation = await transaction.creditReservation.create({
              data: {
                clientId: command.clientId,
                amountCentavos: reserved,
                purchaseIntentId: intent.id,
                reservedAt: now,
              },
              select: { id: true },
            });
            await transaction.creditLedgerEntry.create({
              data: {
                clientId: command.clientId,
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
          await transaction.imageAsset.update({
            where: { id: command.imageAssetId },
            data: {
              state: ImageAssetState.ATTACHED,
              attachedAt: now,
              deletionDueAt: null,
            },
          });
          const payment = await createPendingPayment(transaction, {
            clientId: command.clientId,
            planId: plan!.id,
            purchaseIntentId: intent.id,
            planNameSnapshot: plan!.name,
            durationDaysSnapshot: plan!.durationDays,
            weeklyClassCapSnapshot: plan!.weeklyClassCap,
            classAllowanceSnapshot: plan!.classAllowance,
            planPriceCentavos: plan!.priceCentavos,
            creditAppliedCentavos: reserved,
            discountCentavos: priced.discountCentavos,
            discountReason: priced.discountReason,
            amountDueCentavos,
            startsOn: allocated.startsOn,
            method: PaymentMethod.TRANSFER,
            state: PaymentState.PENDING,
            submittedByAccountId: principal.accountId,
            submittedAt: now,
            createdAt: now,
          });
          if (priced.discountReason === 'founder') {
            await repointFounderReservation(transaction, {
              clientId: command.clientId,
              purchaseIntentId: intent.id,
              paymentId: payment.id,
            });
          }
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
              businessEventKey: `payment-submitted:${payment.id}`,
              title: 'Comprobante por revisar',
              message: 'Tienes un comprobante de pago pendiente de revisión.',
              destination: { type: 'payment', id: payment.id },
              occurredAt: now,
            });
          }
          await transaction.auditRecord.create({
            data: {
              actionCode: 'payment.front_desk_transfer_submitted',
              outcome: AuditOutcome.SUCCEEDED,
              actorKind: AuditActorKind.ACCOUNT,
              actorAccountId: principal.accountId,
              actorRole:
                principal.identity.kind === 'staff'
                  ? (principal.identity.role.toUpperCase() as StaffRole)
                  : null,
              targetType: 'payment',
              targetId: payment.id,
              branchId: command.branchId,
              correlationId: payment.id,
              occurredAt: now,
              metadata: {
                clientId: command.clientId,
                method: 'transfer',
                amountDueCentavos,
              },
            },
          });
          const response = { id: payment.id };
          await transaction.idempotencyRecord.create({
            data: {
              accountId: principal.accountId,
              command: 'record_front_desk_transfer',
              idempotencyKey,
              requestHash: toPrismaBytes(
                createHash('sha256').update(JSON.stringify(command)).digest(),
              ),
              responseStatus: 201,
              responseBody: response,
              createdAt: now,
              expiresAt: new Date(now.getTime() + idempotencyRetention),
            },
          });
          return response;
        },
        { isolationLevel: 'Serializable' },
      ),
    );
  };

  return { record };
};
