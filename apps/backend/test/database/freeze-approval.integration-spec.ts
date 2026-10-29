import { randomUUID } from 'node:crypto';
import { PrismaClient } from '../../src/generated/prisma/client';
import { PrismaBookingCommands } from '../../src/booking/commands/prisma-booking-commands';
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

const codeOf = async (work: Promise<unknown>): Promise<string> => {
  try {
    await work;
    return 'resolved';
  } catch (error) {
    if (error instanceof PaymentRuleError) return error.code;
    return error instanceof Error ? error.message : String(error);
  }
};

describe('freeze approval bounds', () => {
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

  it('refuses a late approval instead of returning classes already taught', async () => {
    const client = await world.newClient('Tarde');
    const sale = await cash(client.clientId, quarterly.id);
    const subscription = await prisma.subscription.findFirstOrThrow({
      where: { paymentId: sale.id },
    });
    const session = await prisma.session.findFirstOrThrow({
      where: {
        startsAt: { gte: new Date('2026-10-01'), lt: new Date('2026-10-05') },
      },
    });
    const bookings = new PrismaBookingCommands(
      prisma,
      () => new Date('2026-09-21T15:00:00.000Z'),
    );
    const booking = await bookings.create(
      { sessionId: session.id },
      {
        accountId: client.accountId,
        authenticationSessionId: randomUUID(),
        identity: { kind: 'client', clientId: client.clientId },
      },
    );
    const before = subscription.remainingClassAllowance;
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
    const administrator = await world.staffPrincipal(
      'paola.mendoza@example.com',
    );
    const late = createPrismaPaymentCommands(prisma, {
      now: () => new Date('2026-10-05T15:00:00.000Z'),
    });

    await expect(
      codeOf(
        late.decideFreeze(
          { freezeId: requested.id, decision: 'approved' },
          administrator,
        ),
      ),
    ).resolves.toBe('freeze_start_in_past');
    await expect(
      prisma.booking.findUniqueOrThrow({ where: { id: booking.id } }),
    ).resolves.toMatchObject({ state: 'BOOKED' });
    await expect(
      prisma.subscription.findUniqueOrThrow({ where: { id: subscription.id } }),
    ).resolves.toMatchObject({
      remainingClassAllowance: before,
      endsOn: subscription.endsOn,
    });
    await expect(
      prisma.freeze.findUniqueOrThrow({ where: { id: requested.id } }),
    ).resolves.toMatchObject({ state: 'REQUESTED' });
  });

  it('refuses a Freeze that would overlap a queued renewal', async () => {
    const client = await world.newClient('Renovada');
    const sale = await cash(client.clientId, quarterly.id);
    const subscription = await prisma.subscription.findFirstOrThrow({
      where: { paymentId: sale.id },
    });
    await prisma.subscription.create({
      data: {
        clientId: client.clientId,
        planId: quarterly.id,
        planNameSnapshot: quarterly.name,
        durationDaysSnapshot: quarterly.durationDays,
        weeklyClassCapSnapshot: 4,
        originalClassAllowance: quarterly.classAllowance,
        remainingClassAllowance: quarterly.classAllowance,
        startsOn: new Date(
          subscription.endsOn.getTime() + 24 * 60 * 60 * 1_000,
        ),
        endsOn: new Date(
          subscription.endsOn.getTime() + 90 * 24 * 60 * 60 * 1_000,
        ),
        state: 'ACTIVE',
        activatedAt: now,
      },
    });
    const commands = createPrismaPaymentCommands(prisma, {
      now: () => new Date('2026-09-22T15:00:00.000Z'),
    });
    const overlappingStart = new Date(
      subscription.endsOn.getTime() - 4 * 24 * 60 * 60 * 1_000,
    )
      .toISOString()
      .slice(0, 10);

    await expect(
      codeOf(
        commands.requestFreeze(
          {
            subscriptionId: subscription.id,
            startsOn: overlappingStart,
            endsOn: subscription.endsOn.toISOString().slice(0, 10),
            reason: 'Pisa la renovación',
          },
          client,
        ),
      ),
    ).resolves.toBe('freeze_outside_term');
  });

  it('does not extend the plan a second time when approval races', async () => {
    const client = await world.newClient('Doble');
    const sale = await cash(client.clientId, quarterly.id);
    const subscription = await prisma.subscription.findFirstOrThrow({
      where: { paymentId: sale.id },
    });
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
    const administrator = await world.staffPrincipal(
      'paola.mendoza@example.com',
    );
    const [first, second] = await Promise.allSettled([
      commands.decideFreeze(
        { freezeId: requested.id, decision: 'approved' },
        administrator,
      ),
      commands.decideFreeze(
        { freezeId: requested.id, decision: 'approved' },
        administrator,
      ),
    ]);
    const succeeded = [first, second].filter(
      (result) => result.status === 'fulfilled',
    );

    expect(succeeded).toHaveLength(1);
    await expect(
      prisma.subscription.findUniqueOrThrow({ where: { id: subscription.id } }),
    ).resolves.toMatchObject({
      endsOn: new Date('2026-12-29T00:00:00.000Z'),
    });
  });
});
