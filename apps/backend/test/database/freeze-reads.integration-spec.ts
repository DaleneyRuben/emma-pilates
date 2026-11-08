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
    return {
      clientId: client.clientId,
      freezeId: requested.id,
      endsOn: subscription.endsOn.toISOString().slice(0, 10),
    };
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

  const addDays = (civil: string, days: number) => {
    const date = new Date(`${civil}T00:00:00.000Z`);
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
  };

  // Walkthrough finding 52: Revisar congelamiento names the plan's end
  // today and the end approving produces, and once decided, who decided
  // it, when, and the end it left.
  it('names the current and the resulting plan end, then the decision', async () => {
    const freeze = await requestFreeze('Con vencimiento');
    const administrator = await world.staffPrincipal(
      'paola.mendoza@example.com',
    );

    await expect(
      world
        .commands()
        .readFreezeReview({ freezeId: freeze.freezeId }, administrator),
    ).resolves.toMatchObject({
      state: 'requested',
      planEndsOn: freeze.endsOn,
      planEndsOnAfter: addDays(freeze.endsOn, 10),
      decidedAt: null,
      decidedByName: null,
    });

    await createPrismaPaymentCommands(prisma, {
      now: () => new Date('2026-09-22T16:00:00.000Z'),
    }).decideFreeze(
      { freezeId: freeze.freezeId, decision: 'approved' },
      administrator,
    );

    const decided = {
      id: freeze.freezeId,
      state: 'approved',
      planEndsOn: freeze.endsOn,
      planEndsOnAfter: addDays(freeze.endsOn, 10),
      decidedAt: '2026-09-22T16:00:00.000Z',
      decidedByName: 'Paola Mendoza',
    };
    await expect(
      world
        .commands()
        .readFreezeReview({ freezeId: freeze.freezeId }, administrator),
    ).resolves.toMatchObject(decided);
    const listed = await world.commands().listDecidedFreezes(administrator);
    expect(listed).toEqual(
      expect.arrayContaining([expect.objectContaining(decided)]),
    );
    expect(
      (await world.commands().listRequestedFreezes(administrator)).map(
        (row) => row.id,
      ),
    ).not.toContain(freeze.freezeId);
  });

  it('keeps a refused request on its unchanged end', async () => {
    const freeze = await requestFreeze('Rechazada');
    const administrator = await world.staffPrincipal(
      'paola.mendoza@example.com',
    );
    await world
      .commands()
      .decideFreeze(
        { freezeId: freeze.freezeId, decision: 'refused' },
        administrator,
      );

    await expect(
      world
        .commands()
        .readFreezeReview({ freezeId: freeze.freezeId }, administrator),
    ).resolves.toMatchObject({
      state: 'refused',
      planEndsOn: freeze.endsOn,
      planEndsOnAfter: null,
      decidedByName: 'Paola Mendoza',
    });
  });
});
