import { randomUUID } from 'node:crypto';
import type { PrismaClient } from '../../../generated/prisma/client';
import { recordAllowanceAdjustment } from '../../../booking/payments/allowance-adjustments';
import { createPrismaPaymentCommands } from '../../../booking/payments/prisma-payment-commands';
import { recordAdministratorAdjustment } from '../../../booking/payments/record-allowance-adjustment';
import type { AuthenticatedPrincipal } from '../../../system-identity/authentication/resolve-authenticated-principal';

const civil = (date: Date): string => date.toISOString().slice(0, 10);

// «Ajustar clases» on the admin web (allowance-adjustment-provider): a
// negative courtesy adjustment on the courtesy Subscription, audited. The
// grant stays in her history; the two net to nothing. It runs after the
// sale, so a refused sale never strips her.
export const removeCourtesyExtras = async (
  prisma: PrismaClient,
  input: {
    clientId: string;
    subscriptionId: string;
    classes: number;
    principal: AuthenticatedPrincipal;
    now: Date;
  },
): Promise<void> => {
  await prisma.$transaction((transaction) =>
    recordAdministratorAdjustment(
      { clientId: input.clientId, classes: -input.classes, reason: 'courtesy' },
      {
        principal: input.principal,
        now: input.now,
        // The sale has already ended it (or expired it, when it began
        // today), so only her own courtesy Subscription is checked.
        findSubscription: () =>
          transaction.subscription.findFirst({
            where: { id: input.subscriptionId, clientId: input.clientId },
            select: { id: true },
          }),
        record: (adjustment) =>
          recordAllowanceAdjustment(transaction, {
            ...adjustment,
            author: {
              accountId: adjustment.authorAccountId,
              role: 'ADMINISTRATOR',
            },
            correlationId: adjustment.subscriptionId,
          }),
      },
    ),
  );
};

// «Registrar pago en efectivo» in the Staff app and admin web: the real
// cash sale, which ends the courtesy Plan the day before (H17), activates
// the new Subscription, and sends «Pago confirmado».
export const sellQuarterlyPlan = (
  prisma: PrismaClient,
  input: {
    clientId: string;
    planId: string;
    branchId: string;
    startsOn: Date;
    principal: AuthenticatedPrincipal;
    now: () => Date;
  },
) =>
  createPrismaPaymentCommands(prisma, { now: input.now }).recordCashPayment(
    {
      clientId: input.clientId,
      planId: input.planId,
      branchId: input.branchId,
      startsOn: civil(input.startsOn),
    },
    input.principal,
    randomUUID(),
  );
