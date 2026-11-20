import { randomUUID } from 'node:crypto';
import { PrismaClient } from '../../src/generated/prisma/client';
import { createPrismaPaymentCommands } from '../../src/booking/payments/prisma-payment-commands';
import {
  fixtures,
  PaymentWorld,
  startPaymentWorld,
} from './payment-lifecycle-test-support';

const quarterly = fixtures.plans.find(
  (item) => item.name === 'Trimestral 36 clases',
)!;

// W16 B/C (owner 2026-11-19): «Motivo si rechazas (opcional)» is kept on the
// refused Freeze, sent to the Client, and shown in «Decididos».
describe('a refused freeze keeps its reason (PostgreSQL)', () => {
  let world: PaymentWorld;
  let prisma: PrismaClient;
  const commands = () =>
    createPrismaPaymentCommands(prisma, {
      now: () => new Date('2026-09-22T15:00:00.000Z'),
    });

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
    const requested = await commands().requestFreeze(
      {
        subscriptionId: subscription.id,
        startsOn: '2026-10-01',
        endsOn: '2026-10-10',
        reason: 'Viaje',
      },
      client,
    );
    return { accountId: client.accountId, freezeId: requested.id };
  };

  it('stores the reason, tells it to the Client, and lists it with the decision', async () => {
    const withReason = await requestFreeze('Con motivo');
    const without = await requestFreeze('Sin motivo');
    const administrator = await world.staffPrincipal(
      'paola.mendoza@example.com',
    );

    await commands().decideFreeze(
      {
        freezeId: withReason.freezeId,
        decision: 'refused',
        refusalReason: 'Esas fechas el estudio está cerrado',
      },
      administrator,
    );
    await commands().decideFreeze(
      { freezeId: without.freezeId, decision: 'refused' },
      administrator,
    );

    await expect(
      prisma.freeze.findUniqueOrThrow({
        where: { id: withReason.freezeId },
        select: { refusalReason: true },
      }),
    ).resolves.toEqual({
      refusalReason: 'Esas fechas el estudio está cerrado',
    });
    const notice = await prisma.notification.findFirstOrThrow({
      where: {
        accountId: withReason.accountId,
        businessEventKey: `freeze-decided:${withReason.freezeId}`,
      },
      select: { message: true },
    });
    expect(notice.message).toBe(
      'Tu solicitud de congelamiento fue rechazada. Motivo: Esas fechas el estudio está cerrado',
    );

    const decided = await world.commands().listDecidedFreezes(administrator);
    expect(decided).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: withReason.freezeId,
          state: 'refused',
          refusalReason: 'Esas fechas el estudio está cerrado',
        }),
        expect.objectContaining({
          id: without.freezeId,
          state: 'refused',
          refusalReason: null,
        }),
      ]),
    );
    await expect(
      world
        .commands()
        .readFreezeReview({ freezeId: withReason.freezeId }, administrator),
    ).resolves.toMatchObject({
      refusalReason: 'Esas fechas el estudio está cerrado',
    });
    const audit = await prisma.auditRecord.findFirstOrThrow({
      where: { targetId: withReason.freezeId, actionCode: 'freeze.refused' },
      select: { metadata: true },
    });
    expect(audit.metadata).toMatchObject({
      refusalReason: 'Esas fechas el estudio está cerrado',
    });
  });
});
