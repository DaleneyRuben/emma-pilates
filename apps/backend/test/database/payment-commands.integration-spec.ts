import { randomUUID } from 'node:crypto';
import { PrismaClient } from '../../src/generated/prisma/client';
import { createPrismaAdapter } from '../../src/database/prisma-adapter';
import { createPrismaPaymentCommands } from '../../src/booking/payments/prisma-payment-commands';
import { PaymentRuleError } from '../../src/booking/payments/payment-errors';
import { applyDevelopmentFixtures } from '../../src/development-fixtures/apply-development-fixtures';
import { buildDevelopmentFixtures } from '../../src/development-fixtures/development-fixtures';
import type { AuthenticatedPrincipal } from '../../src/system-identity/authentication/resolve-authenticated-principal';
import {
  DatabaseTestContext,
  startDatabaseTestContext,
} from './database-test-context';

const today = new Date('2026-09-21T00:00:00.000Z');
const now = new Date('2026-09-21T15:00:00.000Z');

describe('Prisma payment commands', () => {
  let context: DatabaseTestContext;
  let prisma: PrismaClient;
  const fixtures = buildDevelopmentFixtures({ today });
  const plan = fixtures.plans.find((p) => p.name === 'Paquete de 8 clases')!;

  const principalOf = async (email: string): Promise<AuthenticatedPrincipal> => {
    const account = await prisma.account.findUniqueOrThrow({
      where: { email },
      select: { id: true, clientId: true },
    });
    return {
      accountId: account.id,
      authenticationSessionId: randomUUID(),
      identity: { kind: 'client', clientId: account.clientId! },
    };
  };

  const codeOf = async (work: Promise<unknown>): Promise<string> => {
    try {
      await work;
      return 'resolved';
    } catch (error) {
      return error instanceof PaymentRuleError ? error.code : String(error);
    }
  };

  beforeAll(async () => {
    context = await startDatabaseTestContext();
    prisma = new PrismaClient({
      adapter: createPrismaAdapter(context.databaseUrl),
    });
    await applyDevelopmentFixtures(prisma, {
      fixtures,
      passwordHash: 'not-a-real-hash',
    });
  });

  afterAll(async () => {
    await prisma?.$disconnect();
    await context?.stop();
  });

  const commands = () =>
    createPrismaPaymentCommands(prisma, {
      now: () => now,
      referralRewardCentavos: 6000,
    });

  it('creates one open Purchase Intent with frozen Plan snapshots and replays it by idempotency key', async () => {
    const mariana = await principalOf('mariana@example.com');
    const key = randomUUID();

    const intent = await commands().createPurchaseIntent(
      { planId: plan.id },
      mariana,
      key,
    );

    expect(intent).toMatchObject({
      planId: plan.id,
      planName: 'Paquete de 8 clases',
      durationMonths: 1,
      classAllowance: 8,
      planPriceCentavos: 56_000,
      creditReservedCentavos: 0,
      amountDueCentavos: 56_000,
      state: 'open',
      receiptAttached: false,
      expiresAt: new Date('2026-09-22T15:00:00.000Z'),
    });
    await expect(
      commands().createPurchaseIntent({ planId: plan.id }, mariana, key),
    ).resolves.toMatchObject({ id: intent.id });
    await expect(
      codeOf(
        commands().createPurchaseIntent(
          { planId: plan.id },
          mariana,
          randomUUID(),
        ),
      ),
    ).resolves.toBe('purchase_intent_open_exists');
    await expect(
      commands().readOpenPurchaseIntent(mariana),
    ).resolves.toMatchObject({ id: intent.id });
  });

  it('refuses a purchase while the Client has an effective Subscription and allows it after an expired one', async () => {
    const lucia = await principalOf('lucia@example.com');
    const sofia = await principalOf('sofia@example.com');

    await expect(
      codeOf(
        commands().createPurchaseIntent(
          { planId: plan.id },
          lucia,
          randomUUID(),
        ),
      ),
    ).resolves.toBe('subscription_not_expired');
    await expect(
      commands().createPurchaseIntent({ planId: plan.id }, sofia, randomUUID()),
    ).resolves.toMatchObject({ state: 'open', amountDueCentavos: 56_000 });
  });

  it('reserves available Credit against the Plan price and records the reservation in the ledger', async () => {
    const sofia = await principalOf('sofia@example.com');
    const isabel = await principalOf('isabel@example.com');
    const isabelId = isabel.identity.kind === 'client' ? isabel.identity.clientId : '';
    const valeriaId = sofia.identity.kind === 'client' ? sofia.identity.clientId : '';
    const admin = await prisma.account.findUniqueOrThrow({
      where: { email: 'paola.mendoza@example.com' },
      select: { id: true },
    });
    const branch = fixtures.branches[0];

    // Seed an awarded Referral the way a cash purchase by the referred Client
    // would leave it: confirmed Payment, its Subscription, the award entry.
    await prisma.$transaction(async (transaction) => {
      const payment = await transaction.payment.create({
        data: {
          clientId: valeriaId,
          planId: plan.id,
          planNameSnapshot: plan.name,
          durationMonthsSnapshot: plan.durationMonths,
          classAllowanceSnapshot: plan.classAllowance,
          planPriceCentavos: plan.priceCentavos,
          creditAppliedCentavos: 0,
          amountDueCentavos: plan.priceCentavos,
          method: 'CASH',
          state: 'CONFIRMED',
          collectedAtBranchId: branch.id,
          submittedByAccountId: admin.id,
          submittedAt: now,
          decidedByAccountId: admin.id,
          decidedAt: now,
          createdAt: now,
        },
      });
      await transaction.subscription.create({
        data: {
          clientId: valeriaId,
          planId: plan.id,
          paymentId: payment.id,
          planNameSnapshot: plan.name,
          durationMonthsSnapshot: plan.durationMonths,
          originalClassAllowance: plan.classAllowance,
          remainingClassAllowance: plan.classAllowance,
          startsOn: today,
          endsOn: new Date('2026-10-21T00:00:00.000Z'),
          activatedAt: now,
        },
      });
      const referral = await transaction.referral.create({
        data: {
          referrerClientId: isabelId,
          referredClientId: valeriaId,
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
          clientId: isabelId,
          kind: 'REFERRAL_AWARD',
          amountCentavos: 6000,
          referralId: referral.id,
          actorKind: 'WORKER',
          correlationId: randomUUID(),
        },
      });
    });

    // Isabel now holds Bs 60 of Credit and has no Subscription.
    await expect(commands().readCreditSummary(isabel)).resolves.toEqual({
      availableCentavos: 6000,
      reservedCentavos: 0,
    });

    const intent = await commands().createPurchaseIntent(
      { planId: plan.id },
      isabel,
      randomUUID(),
    );

    expect(intent).toMatchObject({
      creditReservedCentavos: 6000,
      amountDueCentavos: 50_000,
    });
    await expect(commands().readCreditSummary(isabel)).resolves.toEqual({
      availableCentavos: 0,
      reservedCentavos: 6000,
    });
    const reservation = await prisma.creditReservation.findUniqueOrThrow({
      where: { purchaseIntentId: intent.id },
      include: { ledgerEntries: true },
    });
    expect(reservation).toMatchObject({ state: 'RESERVED', amountCentavos: 6000 });
    expect(reservation.ledgerEntries).toHaveLength(1);
  });

  it('lists recent Credit activity newest first and the Client referral code with referred Clients', async () => {
    const isabel = await principalOf('isabel@example.com');
    const sofia = await principalOf('sofia@example.com');
    const sofiaId = sofia.identity.kind === 'client' ? sofia.identity.clientId : '';

    const activity = await commands().readCreditActivity(isabel);
    expect(activity.map((entry) => entry.kind)).toEqual([
      'payment_reservation',
      'referral_award',
    ]);
    expect(activity[0]).toMatchObject({ amountCentavos: 6000, occurredAt: expect.any(Date) });

    const referrals = await commands().readReferrals(isabel);
    expect(referrals.referralCode).toEqual(expect.any(String));
    expect(referrals.referrals).toEqual([
      {
        referredClientId: sofiaId,
        referredName: 'Sofía G.',
        state: 'awarded',
        createdAt: now,
        awardedAt: now,
        awardCentavos: 6000,
      },
    ]);
  });

  it('lets exactly one of two simultaneous Purchase Intent requests win', async () => {
    const account = await prisma.account.create({
      data: {
        email: 'racer@example.com',
        client: { create: { name: 'Racer', referralCode: 'RACER' } },
      },
      select: { id: true, clientId: true },
    });
    const racer: AuthenticatedPrincipal = {
      accountId: account.id,
      authenticationSessionId: randomUUID(),
      identity: { kind: 'client', clientId: account.clientId! },
    };

    const results = await Promise.allSettled([
      commands().createPurchaseIntent({ planId: plan.id }, racer, randomUUID()),
      commands().createPurchaseIntent({ planId: plan.id }, racer, randomUUID()),
    ]);

    const fulfilled = results.filter((result) => result.status === 'fulfilled');
    const rejected = results.filter(
      (result): result is PromiseRejectedResult => result.status === 'rejected',
    );
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(rejected[0].reason).toBeInstanceOf(PaymentRuleError);
    expect((rejected[0].reason as PaymentRuleError).code).toBe(
      'purchase_intent_open_exists',
    );
    await expect(
      prisma.purchaseIntent.count({
        where: { clientId: account.clientId!, state: 'OPEN' },
      }),
    ).resolves.toBe(1);
  });
});
