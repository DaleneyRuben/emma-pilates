import { randomUUID } from 'node:crypto';
import { PrismaClient } from '../../src/generated/prisma/client';
import {
  fixtures,
  now,
  PaymentWorld,
  plan,
  startPaymentWorld,
} from './payment-lifecycle-test-support';

const day = 24 * 60 * 60 * 1_000;

// A gapped transfer loses the place when it is confirmed, and the Client
// hears about it. Pricing alone must not lose the place.
describe('founder gap on a confirmed transfer', () => {
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

  const releasePlaces = () =>
    prisma.founderMembership.updateMany({
      where: { deletedAt: null },
      data: { deletedAt: now },
    });

  it('records the loss and tells the Client when a gapped transfer is confirmed', async () => {
    await releasePlaces();
    const founder = await world.newClient('Hueco en transferencia');
    const assistant = await world.staffPrincipal('camila.rojas@example.com');
    await world.commands().recordCashPayment(
      {
        clientId: founder.clientId,
        planId: plan.id,
        branchId: centro().id,
      },
      assistant,
      randomUUID(),
    );
    const ended = new Date('2026-09-13T00:00:00.000Z');
    await prisma.subscription.updateMany({
      where: { clientId: founder.clientId },
      data: {
        state: 'EXPIRED',
        expiredAt: now,
        startsOn: new Date(ended.getTime() - 29 * day),
        endsOn: ended,
      },
    });
    const receipt = await world.readyReceipt(assistant.accountId);
    const pending = await world.commands().recordFrontDeskTransfer(
      {
        clientId: founder.clientId,
        planId: plan.id,
        branchId: centro().id,
        imageAssetId: receipt.id,
        startsOn: '2026-09-22',
      },
      assistant,
      randomUUID(),
    );
    expect(pending).toMatchObject({ discountReason: null });

    await world
      .commands()
      .confirmTransfer(
        { paymentId: pending.id },
        await world.staffPrincipal('paola.mendoza@example.com'),
      );

    const membership = await prisma.founderMembership.findFirstOrThrow({
      where: { clientId: founder.clientId },
    });
    expect(membership).toMatchObject({ status: 'LOST', reason: 'gap' });
    await expect(
      prisma.auditRecord.count({
        where: {
          actionCode: 'founder_membership.lost',
          targetId: membership.id,
        },
      }),
    ).resolves.toBe(1);
    await expect(
      prisma.notification.count({
        where: {
          accountId: founder.accountId,
          type: 'founder_membership_lost',
        },
      }),
    ).resolves.toBe(1);
  });
});
