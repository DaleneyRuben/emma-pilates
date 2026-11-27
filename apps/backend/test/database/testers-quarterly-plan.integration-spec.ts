import { randomUUID } from 'node:crypto';
import { coveringSubscription } from '../../src/booking/evaluations/evaluation-coverage';
import { recordAllowanceAdjustment } from '../../src/booking/payments/allowance-adjustments';
import { hasActivePaidPlan } from '../../src/booking/payments/host-paid-plan';
import { createPrismaCourtesyAccess } from '../../src/booking/payments/prisma-courtesy-access';
import { testersQuarterlyPlan } from '../../src/script-runner/scripts/20261127-testers-quarterly-plan';
import {
  now,
  type PaymentWorld,
  startPaymentWorld,
  today,
} from './payment-lifecycle-test-support';

type Logged = { event: string; fields: Record<string, unknown> };

const courtesyEndsOn = new Date('2026-12-31T00:00:00.000Z');
const grantedAt = new Date('2026-09-10T15:00:00.000Z');
const yesterday = new Date('2026-09-20T00:00:00.000Z');
const branch = 'Centro';

describe('testers move to «Trimestral 36 clases» (owner, 2026-11-27)', () => {
  let world: PaymentWorld;
  const administrator = () => world.staffPrincipal('paola.mendoza@example.com');

  const run = async (
    params: Record<string, unknown>,
    dryRun = false,
  ): Promise<Logged[]> => {
    const logged: Logged[] = [];
    await testersQuarterlyPlan.run({
      prisma: world.prisma,
      params,
      dryRun,
      now: () => now,
      log: (event, fields = {}) => logged.push({ event, fields }),
    });
    return logged;
  };

  const lines = (logged: Logged[]) =>
    logged.filter((line) => line.event === 'testers_quarterly_plan_client');

  // A closed-test tester: Courtesy Access since 10 Sep and the +40 extras
  // an Administrator added on the admin web.
  const tester = async (name: string, extras = 40) => {
    const client = await world.newClient(name);
    const admin = await administrator();
    const payment = await createPrismaCourtesyAccess(world.prisma, {
      now: () => grantedAt,
    }).grant(
      { clientId: client.clientId, endsOn: courtesyEndsOn },
      admin,
      randomUUID(),
    );
    if (extras > 0) {
      await world.prisma.$transaction((transaction) =>
        recordAllowanceAdjustment(transaction, {
          subscriptionId: payment.subscriptionId!,
          clientId: client.clientId,
          classes: extras,
          reason: 'courtesy',
          author: { accountId: admin.accountId, role: 'ADMINISTRATOR' },
          now: grantedAt,
          correlationId: payment.subscriptionId!,
        }),
      );
    }
    return { ...client, courtesySubscriptionId: payment.subscriptionId! };
  };

  const liveExtras = async (subscriptionId: string) =>
    world.prisma.allowanceAdjustment.findMany({
      where: { subscriptionId, deletedAt: null },
      orderBy: { createdAt: 'asc' },
      select: { classes: true, reason: true },
    });

  const quarterlyPayment = (clientId: string) =>
    world.prisma.payment.findFirst({
      where: { clientId, planNameSnapshot: 'Trimestral 36 clases' },
      include: { subscription: true },
    });

  beforeAll(async () => {
    world = await startPaymentWorld();
  });

  afterAll(async () => {
    await world?.stop();
  });

  it('lists every courtesy tester on a dry run and writes nothing', async () => {
    const ana = await tester('Ana Cortesía');
    const counts = async () => ({
      payments: await world.prisma.payment.count(),
      adjustments: await world.prisma.allowanceAdjustment.count(),
      subscriptions: await world.prisma.subscription.findUniqueOrThrow({
        where: { id: ana.courtesySubscriptionId },
      }),
    });
    const before = await counts();

    const logged = await run({ branch }, true);

    await expect(counts()).resolves.toEqual(before);
    expect(lines(logged)).toContainEqual({
      event: 'testers_quarterly_plan_client',
      fields: expect.objectContaining({
        name: 'Ana Cortesía',
        courtesyPlan: 'Plan de cortesía',
        action: 'move',
        extrasToRemove: 40,
        startsOn: '2026-09-21',
      }) as Record<string, unknown>,
    });
    expect(logged.at(-1)).toMatchObject({
      event: 'testers_quarterly_plan_done',
      fields: { dryRun: true },
    });
  });

  it('removes the courtesy extras, ends the courtesy Plan, and sells the quarterly Plan in cash', async () => {
    const bea = await tester('Bea Cortesía');
    // A grant before 2026-11-22 still carries the old name.
    const legacy = await tester('Carla Prueba', 30);
    await world.prisma.subscription.update({
      where: { id: legacy.courtesySubscriptionId },
      data: { planNameSnapshot: 'Acceso de prueba' },
    });
    const admin = await administrator();

    const logged = await run({ branch });

    for (const moved of [bea, legacy]) {
      const courtesy = await world.prisma.subscription.findUniqueOrThrow({
        where: { id: moved.courtesySubscriptionId },
      });
      // Soft: the courtesy Plan stays in her history, ending yesterday.
      expect(courtesy).toMatchObject({ state: 'ACTIVE', endsOn: yesterday });
      const payment = await quarterlyPayment(moved.clientId);
      expect(payment).toMatchObject({
        method: 'CASH',
        state: 'CONFIRMED',
        planPriceCentavos: 210_000,
        startsOn: today,
        collectedAtBranchId: expect.any(String) as string,
        decidedByAccountId: admin.accountId,
        subscription: { state: 'ACTIVE', startsOn: today },
      });
      await expect(
        hasActivePaidPlan(world.prisma, moved.clientId, now),
      ).resolves.toBe(true);
      await expect(
        coveringSubscription(world.prisma, {
          clientId: moved.clientId,
          slotDate: today,
          today,
          now,
        }),
      ).resolves.toMatchObject({ id: payment!.subscription!.id });
    }
    await expect(liveExtras(bea.courtesySubscriptionId)).resolves.toEqual([
      { classes: 40, reason: 'COURTESY' },
      { classes: -40, reason: 'COURTESY' },
    ]);
    await expect(liveExtras(legacy.courtesySubscriptionId)).resolves.toEqual([
      { classes: 30, reason: 'COURTESY' },
      { classes: -30, reason: 'COURTESY' },
    ]);
    expect(lines(logged).map((line) => line.fields)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'Bea Cortesía',
          action: 'moved',
          extrasRemoved: 40,
        }),
        expect.objectContaining({
          name: 'Carla Prueba',
          courtesyPlan: 'Acceso de prueba',
          action: 'moved',
          extrasRemoved: 30,
        }),
      ]),
    );
  });

  it('changes nobody twice', async () => {
    const payments = await world.prisma.payment.count();
    const adjustments = await world.prisma.allowanceAdjustment.count();

    const logged = await run({ branch });

    expect(lines(logged)).toEqual([]);
    await expect(world.prisma.payment.count()).resolves.toBe(payments);
    await expect(world.prisma.allowanceAdjustment.count()).resolves.toBe(
      adjustments,
    );
  });

  it('holds a tester with a class booked ahead, or starts her after it, then skips her as paid', async () => {
    const dora = await tester('Dora Reserva');
    const session = await world.prisma.session.findFirstOrThrow({
      where: { state: 'SCHEDULED', startsAt: { gt: now } },
      orderBy: { startsAt: 'asc' },
    });
    await world.prisma.booking.create({
      data: {
        sessionId: session.id,
        clientId: dora.clientId,
        subscriptionId: dora.courtesySubscriptionId,
        createdByAccountId: dora.accountId,
      },
    });

    await expect(run({ branch })).rejects.toThrow('testers_left');
    await expect(quarterlyPayment(dora.clientId)).resolves.toBeNull();
    await expect(liveExtras(dora.courtesySubscriptionId)).resolves.toEqual([
      { classes: 40, reason: 'COURTESY' },
    ]);

    const logged = await run({ branch, afterBookedClass: true });
    const payment = await quarterlyPayment(dora.clientId);
    expect(payment!.startsOn.getTime()).toBeGreaterThan(today.getTime());
    expect(lines(logged)).toEqual([
      expect.objectContaining({
        fields: expect.objectContaining({
          name: 'Dora Reserva',
          action: 'moved',
        }) as Record<string, unknown>,
      }),
    ]);

    const rerun = await run({ branch, afterBookedClass: true });
    expect(lines(rerun)).toEqual([
      expect.objectContaining({
        fields: expect.objectContaining({
          name: 'Dora Reserva',
          action: 'skip',
          reason: 'paid_plan',
        }) as Record<string, unknown>,
      }),
    ]);
  });

  it('needs the Branch named when the studio has several', async () => {
    await expect(run({})).rejects.toThrow('branch_required');
    await expect(run({ branch: 'Nowhere' })).rejects.toThrow('branch_missing');
  });
});
