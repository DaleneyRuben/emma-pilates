import { PrismaPg } from '@prisma/adapter-pg';
import { randomUUID } from 'node:crypto';
import { hasEarlierPlanPayment } from '../../src/booking/payments/founder-plan-history';
import { hasEarlierRealPayment } from '../../src/booking/payments/gift-class-history';
import type { VoidContext } from '../../src/booking/payments/void-reversals';
import { otherRealSale } from '../../src/booking/payments/void-reward-reversals';
import { PrismaClient } from '../../src/generated/prisma/client';
import {
  DatabaseTestContext,
  startDatabaseTestContext,
} from './database-test-context';

const now = new Date('2026-10-30T14:00:00.000Z');

// FIX-021 (owner 2026-10-30): a Plan hidden from the catalogue after a Client
// bought it is still her first real Plan.
describe('a hidden first plan still counts (PostgreSQL)', () => {
  let context: DatabaseTestContext;
  let prisma: PrismaClient;

  beforeAll(async () => {
    context = await startDatabaseTestContext();
    prisma = new PrismaClient({ adapter: new PrismaPg(context.pool) });
  });

  afterAll(async () => {
    await prisma?.$disconnect();
    await context?.stop();
  });

  const buyerOfHiddenPlan = async () => {
    const plan = await prisma.plan.create({
      data: {
        name: `Promo apertura ${randomUUID().slice(0, 8)}`,
        durationDays: 30,
        classAllowance: 8,
        priceCentavos: 56_000,
        displayOrder: 0,
        hiddenAt: now,
      },
    });
    const client = await prisma.client.create({
      data: { name: 'Ana Rojas', referralCode: randomUUID() },
    });
    const account = await prisma.account.create({
      data: { email: `${randomUUID()}@example.com`, clientId: client.id },
    });
    const branch = await prisma.branch.create({
      data: { name: randomUUID(), address: 'Calle Uno' },
    });
    // A confirmed sale needs its Subscription in the same transaction.
    const paymentId = await prisma.$transaction(async (transaction) => {
      const payment = await transaction.payment.create({
        data: {
          clientId: client.id,
          planId: plan.id,
          planNameSnapshot: plan.name,
          durationDaysSnapshot: 30,
          classAllowanceSnapshot: 8,
          planPriceCentavos: 56_000,
          creditAppliedCentavos: 0,
          amountDueCentavos: 56_000,
          startsOn: new Date('2026-09-01T00:00:00.000Z'),
          method: 'CASH',
          state: 'CONFIRMED',
          collectedAtBranchId: branch.id,
          submittedByAccountId: account.id,
          submittedAt: new Date('2026-09-01T14:00:00.000Z'),
          decidedByAccountId: account.id,
          decidedAt: new Date('2026-09-01T14:00:00.000Z'),
          createdAt: new Date('2026-09-01T14:00:00.000Z'),
        },
      });
      await transaction.subscription.create({
        data: {
          clientId: client.id,
          planId: plan.id,
          paymentId: payment.id,
          planNameSnapshot: plan.name,
          durationDaysSnapshot: 30,
          originalClassAllowance: 8,
          remainingClassAllowance: 8,
          startsOn: new Date('2026-09-01T00:00:00.000Z'),
          endsOn: new Date('2026-09-30T00:00:00.000Z'),
          activatedAt: new Date('2026-09-01T14:00:00.000Z'),
        },
      });
      return payment.id;
    });
    return { clientId: client.id, paymentId };
  };

  it('keeps the gift class from being granted again on the next Plan', async () => {
    const { clientId } = await buyerOfHiddenPlan();

    await expect(
      prisma.$transaction((transaction) =>
        hasEarlierRealPayment(transaction, {
          clientId,
          paymentId: randomUUID(),
        }),
      ),
    ).resolves.toBe(true);
  });

  it('keeps the next Plan from being priced as a founder first Plan', async () => {
    const { clientId } = await buyerOfHiddenPlan();

    await expect(
      prisma.$transaction((transaction) =>
        hasEarlierPlanPayment(transaction, {
          clientId,
          paymentId: randomUUID(),
        }),
      ),
    ).resolves.toBe(true);
  });

  it('keeps her a real buyer when a later sale is voided', async () => {
    const { clientId, paymentId } = await buyerOfHiddenPlan();

    const other = await prisma.$transaction((transaction) =>
      otherRealSale(transaction, {
        clientId,
        paymentId: randomUUID(),
      } as VoidContext),
    );
    expect(other?.id).toBe(paymentId);
  });
});
