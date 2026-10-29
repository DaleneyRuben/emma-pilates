import { randomUUID } from 'node:crypto';
import { PrismaClient } from '../../src/generated/prisma/client';
import { releaseFounderReservationOf } from '../../src/booking/payments/founder-reservation';
import {
  fixtures,
  now,
  PaymentWorld,
  plan,
  startPaymentWorld,
} from './payment-lifecycle-test-support';

// Releasing without a sale id used to match every reserved place.
describe('founder reservation release', () => {
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

  it('keeps every reservation when the release names no sale', async () => {
    const buyer = await world.newClient('Reserva sin identificador');
    const assistant = await world.staffPrincipal('camila.rojas@example.com');
    const receipt = await world.readyReceipt(assistant.accountId);
    await world.commands().recordFrontDeskTransfer(
      {
        clientId: buyer.clientId,
        planId: plan.id,
        branchId: centro().id,
        imageAssetId: receipt.id,
      },
      assistant,
      randomUUID(),
    );
    const before = await prisma.founderMembership.count({
      where: { status: 'RESERVED', deletedAt: null },
    });
    expect(before).toBeGreaterThan(0);

    await expect(
      prisma.$transaction((transaction) =>
        releaseFounderReservationOf(transaction, { now }),
      ),
    ).rejects.toThrow(/founder reservation/);

    await expect(
      prisma.founderMembership.count({
        where: { status: 'RESERVED', deletedAt: null },
      }),
    ).resolves.toBe(before);
  });
});
