import { randomUUID } from 'node:crypto';
import { PrismaClient } from '../../src/generated/prisma/client';
import { PrismaBookingCommands } from '../../src/booking/commands/prisma-booking-commands';
import { createFounderMembershipJob } from '../../src/booking/payments/founder-membership-job';
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

describe('freeze', () => {
  let world: PaymentWorld;
  let prisma: PrismaClient;

  beforeAll(async () => {
    world = await startPaymentWorld();
    ({ prisma } = world);
    await prisma.plan.create({
      data: {
        name: 'Bimestral 16 clases',
        durationDays: 60,
        classAllowance: 16,
        priceCentavos: 112_000,
        displayOrder: 91,
      },
    });
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

  it('moves a quarterly Subscription end by the frozen days and refuses a second request', async () => {
    const client = await world.newClient('Congelada');
    const sale = await cash(client.clientId, quarterly.id);
    const subscription = await prisma.subscription.findFirstOrThrow({
      where: { paymentId: sale.id },
    });
    const commands = createPrismaPaymentCommands(prisma, {
      now: () => now,
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
    expect(requested.state).toBe('requested');

    const administrator = await world.staffPrincipal(
      'paola.mendoza@example.com',
    );
    await commands.decideFreeze(
      { freezeId: requested.id, decision: 'approved' },
      administrator,
    );

    await expect(
      prisma.subscription.findUniqueOrThrow({ where: { id: subscription.id } }),
    ).resolves.toMatchObject({
      endsOn: new Date('2026-12-29T00:00:00.000Z'),
    });
    await expect(
      codeOf(
        commands.requestFreeze(
          {
            subscriptionId: subscription.id,
            startsOn: '2026-11-01',
            endsOn: '2026-11-05',
            reason: 'Otra vez',
          },
          client,
        ),
      ),
    ).resolves.toBe('freeze_not_allowed');
    await expect(
      prisma.payment.findUniqueOrThrow({ where: { id: sale.id } }),
    ).resolves.toMatchObject({ amountDueCentavos: sale.amountDueCentavos });
  });

  it('refuses a 60-day Plan, more than 15 days, and a start in the past', async () => {
    const short = await prisma.plan.findFirstOrThrow({
      where: { name: 'Bimestral 16 clases' },
    });
    const client = await world.newClient('Corta');
    const sale = await cash(client.clientId, short.id);
    const subscription = await prisma.subscription.findFirstOrThrow({
      where: { paymentId: sale.id },
    });
    const commands = createPrismaPaymentCommands(prisma, {
      now: () => now,
    });

    await expect(
      codeOf(
        commands.requestFreeze(
          {
            subscriptionId: subscription.id,
            startsOn: '2026-10-01',
            endsOn: '2026-10-05',
            reason: 'Viaje',
          },
          client,
        ),
      ),
    ).resolves.toBe('freeze_not_allowed');

    const quarterlyClient = await world.newClient('Larga');
    const quarterlySale = await cash(quarterlyClient.clientId, quarterly.id);
    const quarterlySubscription = await prisma.subscription.findFirstOrThrow({
      where: { paymentId: quarterlySale.id },
    });
    await expect(
      codeOf(
        commands.requestFreeze(
          {
            subscriptionId: quarterlySubscription.id,
            startsOn: '2026-10-01',
            endsOn: '2026-10-16',
            reason: 'Demasiado',
          },
          quarterlyClient,
        ),
      ),
    ).resolves.toBe('freeze_not_allowed');
    await expect(
      codeOf(
        commands.requestFreeze(
          {
            subscriptionId: quarterlySubscription.id,
            startsOn: '2026-09-20',
            endsOn: '2026-09-25',
            reason: 'Ayer',
          },
          quarterlyClient,
        ),
      ),
    ).resolves.toBe('freeze_start_in_past');
  });

  it('cancels a Booking inside the Freeze and returns the class', async () => {
    const client = await world.newClient('Reservada');
    const sale = await cash(client.clientId, quarterly.id);
    const subscription = await prisma.subscription.findFirstOrThrow({
      where: { paymentId: sale.id },
    });
    const session = await prisma.session.findFirstOrThrow({
      where: {
        startsAt: { gte: new Date('2026-10-01'), lt: new Date('2026-10-11') },
      },
    });
    const bookings = new PrismaBookingCommands(
      prisma,
      () => new Date('2026-09-21T15:00:00.000Z'),
    );
    const booking = await bookings.create({ sessionId: session.id }, client);
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
    await commands.decideFreeze(
      { freezeId: requested.id, decision: 'approved' },
      administrator,
    );

    await expect(
      prisma.booking.findUniqueOrThrow({ where: { id: booking.id } }),
    ).resolves.toMatchObject({ state: 'CANCELLED' });
    await expect(
      prisma.subscription.findUniqueOrThrow({ where: { id: subscription.id } }),
    ).resolves.toMatchObject({ remainingClassAllowance: before });
  });

  it('refuses a Booking during the Freeze with its own code', async () => {
    const client = await world.newClient('Bloqueada');
    const sale = await cash(client.clientId, quarterly.id);
    const subscription = await prisma.subscription.findFirstOrThrow({
      where: { paymentId: sale.id },
    });
    const commands = createPrismaPaymentCommands(prisma, {
      now: () => now,
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
    await commands.decideFreeze(
      { freezeId: requested.id, decision: 'approved' },
      administrator,
    );
    const session = await prisma.session.findFirstOrThrow({
      where: {
        startsAt: { gte: new Date('2026-10-01'), lt: new Date('2026-10-11') },
      },
    });

    await expect(
      new PrismaBookingCommands(prisma, () => now).create(
        { sessionId: session.id },
        client,
      ),
    ).rejects.toThrow(/Booking is during a Freeze until 2026-10-10/);
  });

  it('keeps a founder through a Freeze that the stored end already covers', async () => {
    const client = await world.newClient('Fundadora congelada');
    const sale = await cash(client.clientId, quarterly.id);
    const subscription = await prisma.subscription.findFirstOrThrow({
      where: { paymentId: sale.id },
    });
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: { endsOn: new Date('2026-10-15T00:00:00.000Z') },
    });
    const commands = createPrismaPaymentCommands(prisma, {
      now: () => new Date('2026-09-22T15:00:00.000Z'),
    });
    const requested = await commands.requestFreeze(
      {
        subscriptionId: subscription.id,
        startsOn: '2026-09-22',
        endsOn: '2026-10-01',
        reason: 'Viaje',
      },
      client,
    );
    const administrator = await world.staffPrincipal(
      'paola.mendoza@example.com',
    );
    await commands.decideFreeze(
      { freezeId: requested.id, decision: 'approved' },
      administrator,
    );

    const job = createFounderMembershipJob(
      prisma,
      () => new Date('2026-10-23T15:00:00.000Z'),
    );
    await expect(job.execute()).resolves.toEqual({ ended: 0 });
    await expect(
      prisma.founderMembership.findFirstOrThrow({
        where: { clientId: client.clientId },
      }),
    ).resolves.toMatchObject({ status: 'ACTIVE' });
  });

  it('refuses an Assistant the decision and tells the Client', async () => {
    const client = await world.newClient('Avisada');
    const sale = await cash(client.clientId, quarterly.id);
    const subscription = await prisma.subscription.findFirstOrThrow({
      where: { paymentId: sale.id },
    });
    const commands = createPrismaPaymentCommands(prisma, {
      now: () => now,
    });
    const requested = await commands.requestFreeze(
      {
        subscriptionId: subscription.id,
        startsOn: '2026-10-01',
        endsOn: '2026-10-05',
        reason: 'Viaje',
      },
      client,
    );
    const assistant = await world.staffPrincipal('camila.rojas@example.com');

    await expect(
      commands.decideFreeze(
        { freezeId: requested.id, decision: 'approved' },
        assistant,
      ),
    ).rejects.toMatchObject({ code: 'freeze_access_denied' });

    const administrator = await world.staffPrincipal(
      'paola.mendoza@example.com',
    );
    await commands.decideFreeze(
      { freezeId: requested.id, decision: 'refused' },
      administrator,
    );
    await expect(
      prisma.notification.findFirstOrThrow({
        where: { businessEventKey: `freeze-decided:${requested.id}` },
      }),
    ).resolves.toMatchObject({
      accountId: client.accountId,
      type: 'freeze_refused',
    });
  });
});
