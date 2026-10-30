import { randomUUID } from 'node:crypto';
import { PrismaClient } from '../../src/generated/prisma/client';
import { createPrismaPaymentCommands } from '../../src/booking/payments/prisma-payment-commands';
import { PaymentRuleError } from '../../src/booking/payments/payment-errors';
import {
  fixtures,
  PaymentWorld,
  startPaymentWorld,
} from './payment-lifecycle-test-support';

const quarterly = fixtures.plans.find(
  (item) => item.name === 'Trimestral 36 clases',
)!;

// Owner decision 2026-10-29: a refused Freeze does not spend the one Freeze.
// Once per Plan counts a requested or an approved Freeze.
describe('a refused freeze does not spend the plan', () => {
  let world: PaymentWorld;
  let prisma: PrismaClient;

  beforeAll(async () => {
    world = await startPaymentWorld();
    ({ prisma } = world);
  });

  afterAll(async () => {
    await world?.stop();
  });

  const codeOf = async (work: Promise<unknown>): Promise<string> => {
    try {
      await work;
      return 'resolved';
    } catch (error) {
      if (error instanceof PaymentRuleError) return error.code;
      return error instanceof Error ? error.message : String(error);
    }
  };

  const quarterlySale = async (name: string) => {
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
    return { client, subscription };
  };

  it('accepts a later request after a late approval is refused', async () => {
    const { client, subscription } = await quarterlySale('Tardía');
    const late = createPrismaPaymentCommands(prisma, {
      now: () => new Date('2026-09-22T15:00:00.000Z'),
    });
    const requested = await late.requestFreeze(
      {
        subscriptionId: subscription.id,
        startsOn: '2026-09-22',
        endsOn: '2026-09-26',
        reason: 'Viaje',
      },
      client,
    );
    const administrator = await world.staffPrincipal(
      'paola.mendoza@example.com',
    );
    const nextDay = createPrismaPaymentCommands(prisma, {
      now: () => new Date('2026-09-23T15:00:00.000Z'),
    });
    await expect(
      codeOf(
        nextDay.decideFreeze(
          { freezeId: requested.id, decision: 'approved' },
          administrator,
        ),
      ),
    ).resolves.toBe('freeze_start_in_past');
    await nextDay.decideFreeze(
      { freezeId: requested.id, decision: 'refused' },
      administrator,
    );

    const tomorrow = createPrismaPaymentCommands(prisma, {
      now: () => new Date('2026-09-28T15:00:00.000Z'),
    });
    const again = await tomorrow.requestFreeze(
      {
        subscriptionId: subscription.id,
        startsOn: '2026-09-29',
        endsOn: '2026-10-03',
        reason: 'Desde mañana',
      },
      client,
    );
    expect(again.state).toBe('requested');
    await tomorrow.decideFreeze(
      { freezeId: again.id, decision: 'approved' },
      administrator,
    );
    await expect(
      prisma.freeze.findUniqueOrThrow({ where: { id: again.id } }),
    ).resolves.toMatchObject({ state: 'APPROVED' });
  });

  it('still refuses a second request while one is requested or approved', async () => {
    const { client, subscription } = await quarterlySale('Ocupada');
    const commands = createPrismaPaymentCommands(prisma, {
      now: () => new Date('2026-09-22T15:00:00.000Z'),
    });
    const requested = await commands.requestFreeze(
      {
        subscriptionId: subscription.id,
        startsOn: '2026-10-01',
        endsOn: '2026-10-10',
        reason: 'Viaje',
      },
      client,
    );
    await expect(
      codeOf(
        commands.requestFreeze(
          {
            subscriptionId: subscription.id,
            startsOn: '2026-11-01',
            endsOn: '2026-11-05',
            reason: 'Mientras espera',
          },
          client,
        ),
      ),
    ).resolves.toBe('freeze_not_allowed');

    const administrator = await world.staffPrincipal(
      'paola.mendoza@example.com',
    );
    await commands.decideFreeze(
      { freezeId: requested.id, decision: 'approved' },
      administrator,
    );
    await expect(
      codeOf(
        commands.requestFreeze(
          {
            subscriptionId: subscription.id,
            startsOn: '2026-11-01',
            endsOn: '2026-11-05',
            reason: 'Ya aprobado',
          },
          client,
        ),
      ),
    ).resolves.toBe('freeze_not_allowed');
  });
});
