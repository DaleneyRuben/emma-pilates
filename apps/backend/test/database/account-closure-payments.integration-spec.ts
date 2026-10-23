import { randomUUID } from 'node:crypto';
import { createPrismaAccountClosure } from '../../src/booking/account-closure/prisma-account-closure';
import { summarizeCredit } from '../../src/booking/payments/credit-summary';
import { createPrismaPaymentCommands } from '../../src/booking/payments/prisma-payment-commands';
import { toPrismaBytes } from '../../src/database/prisma-bytes';
import {
  ClosureClient,
  closureNow,
  closurePassword,
  ClosureWorld,
  startClosureWorld,
} from './account-closure-test-support';

// BE-007 G3 and G5 on real PostgreSQL: a pending transfer Payment blocks
// closure, and the Credit is released and then forfeited through the ledger.
describe('closing a Client Account with Payments and Credit (PostgreSQL)', () => {
  let world: ClosureWorld;
  const closure = () =>
    createPrismaAccountClosure(world.prisma, { now: () => closureNow });
  const payments = () =>
    createPrismaPaymentCommands(world.prisma, {
      now: () => closureNow,
    });

  beforeAll(async () => {
    world = await startClosureWorld();
  });

  afterAll(async () => {
    await world?.stop();
  });

  const plan = () =>
    world.prisma.plan.findFirstOrThrow({ orderBy: { displayOrder: 'asc' } });

  // Bs 60 of Credit the way a referred purchase leaves it: a confirmed
  // Payment, its Subscription, the awarded Referral, and the award entry.
  const awardCredit = async (referrer: ClosureClient) => {
    const referred = await world.newClient('Referida', {
      subscription: false,
    });
    const chosen = await plan();
    await world.prisma.$transaction(async (transaction) => {
      const payment = await transaction.payment.create({
        data: {
          clientId: referred.clientId,
          planId: chosen.id,
          planNameSnapshot: chosen.name,
          durationMonthsSnapshot: chosen.durationMonths,
          classAllowanceSnapshot: chosen.classAllowance,
          planPriceCentavos: chosen.priceCentavos,
          creditAppliedCentavos: 0,
          amountDueCentavos: chosen.priceCentavos,
          method: 'CASH',
          state: 'CONFIRMED',
          collectedAtBranchId: (await transaction.branch.findFirstOrThrow()).id,
          submittedByAccountId: world.administrator.accountId,
          submittedAt: closureNow,
          decidedByAccountId: world.administrator.accountId,
          decidedAt: closureNow,
          createdAt: closureNow,
        },
      });
      await transaction.subscription.create({
        data: {
          clientId: referred.clientId,
          planId: chosen.id,
          paymentId: payment.id,
          planNameSnapshot: chosen.name,
          durationMonthsSnapshot: chosen.durationMonths,
          originalClassAllowance: chosen.classAllowance,
          remainingClassAllowance: chosen.classAllowance,
          startsOn: new Date('2026-09-21T00:00:00.000Z'),
          endsOn: new Date('2026-10-21T00:00:00.000Z'),
          activatedAt: closureNow,
        },
      });
      const referral = await transaction.referral.create({
        data: {
          referrerClientId: referrer.clientId,
          referredClientId: referred.clientId,
          createdAt: closureNow,
          state: 'AWARDED',
          qualifiedPaymentId: payment.id,
          qualifiedAt: closureNow,
          awardCentavos: 6000,
          awardedAt: closureNow,
        },
      });
      await transaction.creditLedgerEntry.create({
        data: {
          clientId: referrer.clientId,
          kind: 'REFERRAL_AWARD',
          amountCentavos: 6000,
          occurredAt: new Date(closureNow.getTime() - 60 * 60 * 1_000),
          referralId: referral.id,
          actorKind: 'WORKER',
          correlationId: randomUUID(),
        },
      });
    });
  };

  const ledgerOf = async (client: ClosureClient) =>
    world.prisma.creditLedgerEntry.findMany({
      where: { clientId: client.clientId },
      orderBy: [{ occurredAt: 'asc' }, { id: 'asc' }],
      select: {
        kind: true,
        amountCentavos: true,
        actorKind: true,
        actorAccountId: true,
      },
    });

  const submitTransfer = async (client: ClosureClient) => {
    const receipt = await world.prisma.imageAsset.create({
      data: {
        ownerAccountId: client.accountId,
        purpose: 'TRANSFER_RECEIPT',
        state: 'READY',
        pendingObjectKey: `pending/${randomUUID()}`,
        declaredMediaType: 'JPEG',
        declaredByteSize: 1234,
        declaredChecksum: toPrismaBytes(Buffer.alloc(32, 1)),
        createdAt: closureNow,
        expiresAt: new Date(closureNow.getTime() + 15 * 60 * 1_000),
        finalizedAt: closureNow,
      },
      select: { id: true },
    });
    const chosen = await plan();
    const intent = await payments().createPurchaseIntent(
      { planId: chosen.id },
      client.principal,
      randomUUID(),
    );
    await payments().attachReceipt(
      { purchaseIntentId: intent.id, imageAssetId: receipt.id },
      client.principal,
      randomUUID(),
    );
    return payments().submitTransfer(
      { purchaseIntentId: intent.id },
      client.principal,
      randomUUID(),
    );
  };

  it('refuses closure while a transfer Payment awaits review and changes nothing', async () => {
    const ana = await world.newClient('Ana Justiniano', {
      subscription: false,
    });
    await submitTransfer(ana);

    await expect(
      closure().close(
        { clientId: ana.clientId, password: closurePassword },
        ana.principal,
      ),
    ).rejects.toMatchObject({ code: 'closure_payment_pending', status: 409 });

    await expect(
      world.prisma.client.findUniqueOrThrow({
        where: { id: ana.clientId },
        select: { deletedAt: true },
      }),
    ).resolves.toEqual({ deletedAt: null });
    await expect(
      world.prisma.auditRecord.count({
        where: { actionCode: 'account.closed', targetId: ana.accountId },
      }),
    ).resolves.toBe(0);
  });

  it('forfeits the available Credit through one account_closure entry', async () => {
    const ana = await world.newClient('Ana Justiniano');
    await awardCredit(ana);

    const summary = await closure().close(
      { clientId: ana.clientId, password: closurePassword },
      ana.principal,
    );

    expect(summary.forfeitedCreditCentavos).toBe(6000);
    const ledger = await ledgerOf(ana);
    expect(ledger.map(({ kind }) => kind)).toEqual([
      'REFERRAL_AWARD',
      'ACCOUNT_CLOSURE',
    ]);
    expect(ledger[1]).toEqual({
      kind: 'ACCOUNT_CLOSURE',
      amountCentavos: 6000,
      actorKind: 'ACCOUNT',
      actorAccountId: ana.accountId,
    });
    expect(
      summarizeCredit(
        ledger.map((entry) => ({
          kind: entry.kind.toLowerCase() as 'referral_award',
          amountCentavos: entry.amountCentavos,
        })),
      ),
    ).toEqual({ availableCentavos: 0, reservedCentavos: 0 });
  });

  it('releases the Credit an open Purchase Intent holds before forfeiting it', async () => {
    const ana = await world.newClient('Ana Justiniano', {
      subscription: false,
    });
    await awardCredit(ana);
    const chosen = await plan();
    const intent = await payments().createPurchaseIntent(
      { planId: chosen.id },
      ana.principal,
      randomUUID(),
    );

    const summary = await closure().close(
      { clientId: ana.clientId, password: closurePassword },
      ana.principal,
    );

    expect(summary.forfeitedCreditCentavos).toBe(6000);
    await expect(
      world.prisma.purchaseIntent.findUniqueOrThrow({
        where: { id: intent.id },
        select: { state: true, expiredAt: true },
      }),
    ).resolves.toEqual({ state: 'EXPIRED', expiredAt: closureNow });
    // The commands stamp the reservation with the real clock, so compare
    // the entries as a set.
    expect((await ledgerOf(ana)).map(({ kind }) => kind).sort()).toEqual([
      'ACCOUNT_CLOSURE',
      'PAYMENT_RELEASE',
      'PAYMENT_RESERVATION',
      'REFERRAL_AWARD',
    ]);
  });

  it('writes no ledger entry when there is no Credit to forfeit', async () => {
    const ana = await world.newClient('Ana Justiniano');

    const summary = await closure().close(
      { clientId: ana.clientId, password: closurePassword },
      ana.principal,
    );

    expect(summary.forfeitedCreditCentavos).toBe(0);
    await expect(ledgerOf(ana)).resolves.toEqual([]);
  });
});
