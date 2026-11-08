import { randomUUID } from 'node:crypto';
import { PrismaClient } from '../../src/generated/prisma/client';
import { createPrismaPaymentCommands } from '../../src/booking/payments/prisma-payment-commands';
import { PaymentRuleError } from '../../src/booking/payments/payment-errors';
import {
  fixtures,
  now,
  PaymentWorld,
  startPaymentWorld,
} from './payment-lifecycle-test-support';

const quarterly = fixtures.plans.find(
  (item) => item.name === 'Trimestral 36 clases',
)!;

describe('freeze withdrawal', () => {
  let world: PaymentWorld;
  let prisma: PrismaClient;

  beforeAll(async () => {
    world = await startPaymentWorld();
    ({ prisma } = world);
  });

  afterAll(async () => {
    await world?.stop();
  });

  const cash = async (clientId: string, planId: string) => {
    const assistant = await world.staffPrincipal('camila.rojas@example.com');
    const centro = fixtures.branches.find(
      (branch) => branch.name === 'Centro',
    )!;
    return world
      .commands()
      .recordCashPayment(
        { clientId, planId, branchId: centro.id },
        assistant,
        randomUUID(),
      );
  };

  const codeOf = async (work: Promise<unknown>): Promise<string> => {
    try {
      await work;
      return 'resolved';
    } catch (error) {
      if (error instanceof PaymentRuleError) return error.code;
      return error instanceof Error ? error.message : String(error);
    }
  };

  // Walkthrough finding 51 (owner 2026-11-08): the Client may withdraw a
  // request still in review. The row is soft deleted, the operators' notices
  // are settled, and she may ask again.
  it('lets the Client withdraw a request in review and ask again', async () => {
    const client = await world.newClient('Retira');
    const other = await world.newClient('Otra clienta');
    const sale = await cash(client.clientId, quarterly.id);
    const subscription = await prisma.subscription.findFirstOrThrow({
      where: { paymentId: sale.id },
    });
    const commands = createPrismaPaymentCommands(prisma, { now: () => now });
    const request = () =>
      commands.requestFreeze(
        {
          subscriptionId: subscription.id,
          startsOn: '2026-10-01',
          endsOn: '2026-10-05',
          reason: 'Viaje',
        },
        client,
      );
    const requested = await request();

    await expect(
      codeOf(commands.withdrawFreeze({ freezeId: requested.id }, other)),
    ).resolves.toBe('freeze_not_allowed');
    await expect(
      commands.withdrawFreeze({ freezeId: requested.id }, client),
    ).resolves.toEqual({ state: 'withdrawn' });

    await expect(
      prisma.freeze.findUniqueOrThrow({ where: { id: requested.id } }),
    ).resolves.toMatchObject({ deletedAt: now });
    const notices = await prisma.notification.findMany({
      where: { businessEventKey: `freeze-requested:${requested.id}` },
    });
    expect(notices.filter((notice) => notice.readAt === null)).toEqual([]);
    await expect(
      prisma.auditRecord.findFirst({
        where: { actionCode: 'freeze.withdrawn' },
        orderBy: { occurredAt: 'desc' },
      }),
    ).resolves.not.toBeNull();

    const again = await request();
    const administrator = await world.staffPrincipal(
      'paola.mendoza@example.com',
    );
    await commands.decideFreeze(
      { freezeId: again.id, decision: 'approved' },
      administrator,
    );
    await expect(
      codeOf(commands.withdrawFreeze({ freezeId: again.id }, client)),
    ).resolves.toBe('freeze_already_decided');
  });
});
