import { randomUUID } from 'node:crypto';
import { PrismaClient } from '../../src/generated/prisma/client';
import { createPrismaPaymentCommands } from '../../src/booking/payments/prisma-payment-commands';
import {
  fixtures,
  PaymentWorld,
  startPaymentWorld,
} from './payment-lifecycle-test-support';
import { attachClientPhoto } from './client-photo-test-support';

const quarterly = fixtures.plans.find(
  (item) => item.name === 'Trimestral 36 clases',
)!;

// FIX-041: Congelamientos shows each requesting Client with her photo.
describe('requested freezes for review (PostgreSQL)', () => {
  let world: PaymentWorld;
  let prisma: PrismaClient;

  beforeAll(async () => {
    world = await startPaymentWorld();
    ({ prisma } = world);
  });

  afterAll(async () => {
    await world?.stop();
  });

  const requestFreeze = async (name: string) => {
    const client = await world.newClient(name);
    const assistant = await world.staffPrincipal('camila.rojas@example.com');
    const centro = fixtures.branches.find(
      (branch) => branch.name === 'Centro',
    )!;
    const sale = await world.commands().recordCashPayment(
      {
        clientId: client.clientId,
        planId: quarterly.id,
        branchId: centro.id,
      },
      assistant,
      randomUUID(),
    );
    const subscription = await prisma.subscription.findFirstOrThrow({
      where: { paymentId: sale.id },
    });
    const requested = await createPrismaPaymentCommands(prisma, {
      now: () => new Date('2026-09-22T15:00:00.000Z'),
    }).requestFreeze(
      {
        subscriptionId: subscription.id,
        startsOn: '2026-10-01',
        endsOn: '2026-10-10',
        reason: 'Viaje',
      },
      client,
    );
    return { clientId: client.clientId, freezeId: requested.id };
  };

  it('names each requesting Client photo in the list and the review', async () => {
    const withPhoto = await requestFreeze('Con foto');
    const withoutPhoto = await requestFreeze('Sin foto');
    const photo = await attachClientPhoto(prisma, withPhoto.clientId);
    const administrator = await world.staffPrincipal(
      'paola.mendoza@example.com',
    );

    const listed = await world.commands().listRequestedFreezes(administrator);
    expect(listed).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: withPhoto.freezeId,
          clientName: 'Con foto',
          clientPhoto: { imageAssetId: photo },
        }),
        expect.objectContaining({
          id: withoutPhoto.freezeId,
          clientName: 'Sin foto',
          clientPhoto: null,
        }),
      ]),
    );
    await expect(
      world
        .commands()
        .readFreezeReview({ freezeId: withPhoto.freezeId }, administrator),
    ).resolves.toMatchObject({ clientPhoto: { imageAssetId: photo } });
  });
});
