import { randomUUID } from 'node:crypto';
import { PrismaClient } from '../../src/generated/prisma/client';
import { BookingAccessDeniedError } from '../../src/booking/commands/create-booking';
import { PaymentRuleError } from '../../src/booking/payments/payment-errors';
import { createPrismaPaymentCommands } from '../../src/booking/payments/prisma-payment-commands';
import { createPrismaAdapter } from '../../src/database/prisma-adapter';
import { toPrismaBytes } from '../../src/database/prisma-bytes';
import { applyDevelopmentFixtures } from '../../src/development-fixtures/apply-development-fixtures';
import { buildDevelopmentFixtures } from '../../src/development-fixtures/development-fixtures';
import type { AuthenticatedPrincipal } from '../../src/system-identity/authentication/resolve-authenticated-principal';
import { startDatabaseTestContext } from './database-test-context';

export const today = new Date('2026-09-21T00:00:00.000Z');
export const now = new Date('2026-09-21T15:00:00.000Z');
export const hour = 60 * 60 * 1_000;
export const fixtures = buildDevelopmentFixtures({ today });
export const plan = fixtures.plans.find(
  (p) => p.name === 'Paquete de 8 clases',
)!;

export const codeOf = async (work: Promise<unknown>): Promise<string> => {
  try {
    await work;
    return 'resolved';
  } catch (error) {
    if (error instanceof PaymentRuleError) return error.code;
    if (error instanceof BookingAccessDeniedError) return 'access_denied';
    return String(error);
  }
};

// The development fixtures on a disposable database, with the builders the
// payment lifecycle specs share: Staff principals, fresh Clients, receipts,
// and a seeded referral award.
export const startPaymentWorld = async () => {
  const context = await startDatabaseTestContext();
  const prisma = new PrismaClient({
    adapter: createPrismaAdapter(context.databaseUrl),
  });
  await applyDevelopmentFixtures(prisma, {
    fixtures,
    passwordHash: 'not-a-real-hash',
  });

  const commands = (at: Date = now) =>
    createPrismaPaymentCommands(prisma, {
      now: () => at,
      referralRewardCentavos: 6000,
    });

  const staffPrincipal = async (
    email: string,
  ): Promise<AuthenticatedPrincipal> => {
    const account = await prisma.account.findFirstOrThrow({
      where: { email, deletedAt: null },
      select: {
        id: true,
        staffMember: {
          select: {
            id: true,
            role: true,
            branchAssignments: { select: { branchId: true } },
          },
        },
      },
    });
    return {
      accountId: account.id,
      authenticationSessionId: randomUUID(),
      identity: {
        kind: 'staff',
        staffMemberId: account.staffMember!.id,
        role: account.staffMember!.role.toLowerCase() as 'administrator',
        branchIds: account.staffMember!.branchAssignments.map(
          (a) => a.branchId,
        ),
      },
    };
  };

  const newClient = async (name: string) => {
    const account = await prisma.account.create({
      data: {
        email: `${randomUUID()}@example.com`,
        activatedAt: now,
        emailVerifiedAt: now,
        client: { create: { name, referralCode: randomUUID().slice(0, 8) } },
      },
      select: { id: true, clientId: true },
    });
    const principal: AuthenticatedPrincipal & { clientId: string } = {
      accountId: account.id,
      authenticationSessionId: randomUUID(),
      identity: { kind: 'client', clientId: account.clientId! },
      clientId: account.clientId!,
    };
    return principal;
  };

  const readyReceipt = async (
    ownerAccountId: string,
    state: 'READY' | 'PENDING' = 'READY',
  ) =>
    prisma.imageAsset.create({
      data: {
        ownerAccountId,
        purpose: 'TRANSFER_RECEIPT',
        state,
        pendingObjectKey: `pending/${randomUUID()}`,
        declaredMediaType: 'JPEG',
        declaredByteSize: 1234,
        declaredChecksum: toPrismaBytes(Buffer.alloc(32, 1)),
        createdAt: now,
        expiresAt: new Date(now.getTime() + 15 * 60 * 1_000),
        finalizedAt: state === 'READY' ? now : null,
        deletionDueAt: new Date(now.getTime() + hour),
      },
      select: { id: true },
    });

  // Gives `referrerClientId` Bs 60 of Credit the way a cash purchase by a
  // brand-new referred Client would leave the ledger.
  const seedAward = async (referrerClientId: string) => {
    const referred = await newClient('Referida');
    const admin = await prisma.account.findFirstOrThrow({
      where: { email: 'paola.mendoza@example.com', deletedAt: null },
      select: { id: true },
    });
    await prisma.$transaction(async (transaction) => {
      const payment = await transaction.payment.create({
        data: {
          clientId: referred.clientId,
          planId: plan.id,
          planNameSnapshot: plan.name,
          durationDaysSnapshot: plan.durationDays,
          classAllowanceSnapshot: plan.classAllowance,
          planPriceCentavos: plan.priceCentavos,
          creditAppliedCentavos: 0,
          amountDueCentavos: plan.priceCentavos,
          startsOn: today,
          method: 'CASH',
          state: 'CONFIRMED',
          collectedAtBranchId: fixtures.branches[0].id,
          submittedByAccountId: admin.id,
          submittedAt: now,
          decidedByAccountId: admin.id,
          decidedAt: now,
          createdAt: now,
        },
      });
      await transaction.subscription.create({
        data: {
          clientId: referred.clientId,
          planId: plan.id,
          paymentId: payment.id,
          planNameSnapshot: plan.name,
          durationDaysSnapshot: plan.durationDays,
          originalClassAllowance: plan.classAllowance,
          remainingClassAllowance: plan.classAllowance,
          startsOn: today,
          endsOn: new Date('2026-10-21T00:00:00.000Z'),
          activatedAt: now,
        },
      });
      const referral = await transaction.referral.create({
        data: {
          referrerClientId,
          referredClientId: referred.clientId,
          createdAt: now,
          state: 'AWARDED',
          qualifiedPaymentId: payment.id,
          qualifiedAt: now,
          awardCentavos: 6000,
          awardedAt: now,
        },
      });
      await transaction.creditLedgerEntry.create({
        data: {
          clientId: referrerClientId,
          kind: 'REFERRAL_AWARD',
          amountCentavos: 6000,
          referralId: referral.id,
          actorKind: 'WORKER',
          correlationId: randomUUID(),
        },
      });
    });
  };

  return {
    prisma,
    commands,
    staffPrincipal,
    newClient,
    readyReceipt,
    seedAward,
    stop: async () => {
      await prisma.$disconnect();
      await context.stop();
    },
  };
};

export type PaymentWorld = Awaited<ReturnType<typeof startPaymentWorld>>;
