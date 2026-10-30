import { randomUUID } from 'node:crypto';
import { PrismaClient } from '../../src/generated/prisma/client';
import { createPurchaseIntentExpiryJob } from '../../src/booking/payments/purchase-intent-expiry-job';
import {
  fixtures,
  now,
  PaymentWorld,
  plan,
  startPaymentWorld,
} from './payment-lifecycle-test-support';

const hour = 60 * 60 * 1_000;

// FIX-013, owner 2026-10-30: a transfer nobody reviews holds its founder
// place for 3 days, then frees it for the next buyer.
describe('founder place of an unreviewed transfer', () => {
  let world: PaymentWorld;
  let prisma: PrismaClient;

  beforeAll(async () => {
    world = await startPaymentWorld();
    ({ prisma } = world);
  });

  afterAll(async () => {
    await world?.stop();
  });

  const centro = () =>
    fixtures.branches.find((branch) => branch.name === 'Centro')!;

  const pendingTransfer = async (name: string, planId = plan.id) => {
    const buyer = await world.newClient(name);
    const assistant = await world.staffPrincipal('camila.rojas@example.com');
    const receipt = await world.readyReceipt(assistant.accountId);
    const pending = await world.commands().recordFrontDeskTransfer(
      {
        clientId: buyer.clientId,
        planId,
        branchId: centro().id,
        imageAssetId: receipt.id,
      },
      assistant,
      randomUUID(),
    );
    return { buyer, pending };
  };

  const reservationOf = (clientId: string) =>
    prisma.founderMembership.findFirst({
      where: { clientId, status: 'RESERVED', deletedAt: null },
      select: { id: true },
    });

  const sweepAt = (instant: Date) =>
    createPurchaseIntentExpiryJob(prisma, () => instant).execute();

  it('keeps the place while the transfer is under 3 days old', async () => {
    const { buyer } = await pendingTransfer('Revisión pronta');

    await sweepAt(new Date(now.getTime() + 71 * hour));

    await expect(reservationOf(buyer.clientId)).resolves.not.toBeNull();
  });

  it('frees the place once the transfer waits 3 days, and audits why', async () => {
    const { buyer, pending } = await pendingTransfer('Revisión tardía');
    const reserved = await reservationOf(buyer.clientId);

    // The earlier spec's transfer is past 3 days by then too.
    const swept = await sweepAt(new Date(now.getTime() + 72 * hour + 60_000));
    expect(swept.foundersReleased).toBeGreaterThanOrEqual(1);

    await expect(reservationOf(buyer.clientId)).resolves.toBeNull();
    await expect(
      prisma.payment.findUniqueOrThrow({ where: { id: pending.id } }),
    ).resolves.toMatchObject({ state: 'PENDING' });
    const audit = await prisma.auditRecord.findFirstOrThrow({
      where: {
        actionCode: 'founder_membership.released',
        targetId: reserved!.id,
      },
      select: { metadata: true, correlationId: true },
    });
    expect(audit).toMatchObject({
      correlationId: pending.id,
      metadata: { clientId: buyer.clientId, reason: 'payment_unreviewed' },
    });
  });

  it('confirms a late transfer for a Plan hidden since, with its founder place and gift', async () => {
    const promo = await prisma.plan.create({
      data: {
        name: `Promo apertura ${randomUUID().slice(0, 8)}`,
        durationDays: plan.durationDays,
        classAllowance: plan.classAllowance,
        priceCentavos: plan.priceCentavos,
        displayOrder: 90,
      },
    });
    const { buyer, pending } = await pendingTransfer('Plan oculto', promo.id);
    await sweepAt(new Date(now.getTime() + 72 * hour + 60_000));
    await prisma.plan.update({
      where: { id: promo.id },
      data: { hiddenAt: now },
    });

    await world
      .commands()
      .confirmTransfer(
        { paymentId: pending.id },
        await world.staffPrincipal('paola.mendoza@example.com'),
      );

    await expect(
      prisma.founderMembership.findFirst({
        where: { clientId: buyer.clientId, deletedAt: null },
        select: { status: true },
      }),
    ).resolves.toMatchObject({ status: 'ACTIVE' });
    await expect(
      prisma.allowanceAdjustment.count({
        where: { clientId: buyer.clientId, reason: 'GIFT_NEW_CLIENT' },
      }),
    ).resolves.toBe(1);
  });
});
