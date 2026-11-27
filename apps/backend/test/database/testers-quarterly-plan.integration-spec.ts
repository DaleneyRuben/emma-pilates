import { coveringSubscription } from '../../src/booking/evaluations/evaluation-coverage';
import { hasActivePaidPlan } from '../../src/booking/payments/host-paid-plan';
import { sellQuarterlyPlan } from '../../src/script-runner/scripts/testers-quarterly-plan/move-writes';
import {
  now,
  type PaymentWorld,
  startPaymentWorld,
  today,
} from './payment-lifecycle-test-support';
import {
  branch,
  clientLines,
  lineOf,
  testersHarness,
  yesterday,
} from './testers-quarterly-plan-test-support';

describe('testers move to «Trimestral 36 clases» (owner, 2026-11-27)', () => {
  let world: PaymentWorld;
  const harness = testersHarness(() => world);
  const { run, tester, liveExtras, quarterlyPayment, courtesySubscription } =
    harness;

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
      courtesy: await courtesySubscription(ana.courtesySubscriptionId),
    });
    const before = await counts();

    const logged = await run({ branch }, true);

    await expect(counts()).resolves.toEqual(before);
    expect(lineOf(logged, 'Ana Cortesía')).toMatchObject({
      courtesyPlan: 'Plan de cortesía',
      action: 'move',
      extrasToRemove: 40,
      startsOn: '2026-09-21',
      afterBookedClassOn: null,
    });
    expect(logged.at(-1)).toMatchObject({
      event: 'testers_quarterly_plan_done',
      fields: { dryRun: true },
    });
  });

  it('sells the quarterly Plan in cash, ends the courtesy Plan, and removes the unspent courtesy extras', async () => {
    const bea = await tester('Bea Cortesía');
    // A grant before 2026-11-22 still carries the old name.
    const legacy = await tester('Carla Prueba', 30);
    await world.prisma.subscription.update({
      where: { id: legacy.courtesySubscriptionId },
      data: { planNameSnapshot: 'Acceso de prueba' },
    });
    // She already spent two of her extras.
    await world.prisma.allowanceAdjustment.create({
      data: {
        subscriptionId: bea.courtesySubscriptionId,
        clientId: bea.clientId,
        classes: -2,
        reason: 'CONSUMPTION',
        authorAccountId: bea.accountId,
      },
    });
    const admin = await harness.administrator();

    const logged = await run({ branch });

    for (const moved of [bea, legacy]) {
      // Soft: the courtesy Plan stays in her history, ending yesterday.
      await expect(
        courtesySubscription(moved.courtesySubscriptionId),
      ).resolves.toMatchObject({ state: 'ACTIVE', endsOn: yesterday });
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
      { classes: -2, reason: 'CONSUMPTION' },
      { classes: -38, reason: 'COURTESY' },
    ]);
    await expect(liveExtras(legacy.courtesySubscriptionId)).resolves.toEqual([
      { classes: 30, reason: 'COURTESY' },
      { classes: -30, reason: 'COURTESY' },
    ]);
    const beaPayment = await quarterlyPayment(bea.clientId);
    expect(lineOf(logged, 'Bea Cortesía')).toMatchObject({
      action: 'moved',
      extrasRemoved: 38,
      paymentId: beaPayment!.id,
      amountDueCentavos: beaPayment!.amountDueCentavos,
      discountCentavos: beaPayment!.discountCentavos,
    });
    expect(lineOf(logged, 'Carla Prueba')).toMatchObject({
      courtesyPlan: 'Acceso de prueba',
      action: 'moved',
      extrasRemoved: 30,
    });
  });

  it('changes nobody twice', async () => {
    const payments = await world.prisma.payment.count();
    const adjustments = await world.prisma.allowanceAdjustment.count();

    const logged = await run({ branch });

    expect(clientLines(logged)).toEqual([]);
    await expect(world.prisma.payment.count()).resolves.toBe(payments);
    await expect(world.prisma.allowanceAdjustment.count()).resolves.toBe(
      adjustments,
    );
  });

  it('removes the extras a run left behind after her sale, and sells nothing again', async () => {
    const elsa = await tester('Elsa Corte');
    // A run that stopped between the sale and the removal.
    await sellQuarterlyPlan(world.prisma, {
      clientId: elsa.clientId,
      planId: (await quarterlyPlanId())!,
      branchId: (await world.prisma.branch.findFirstOrThrow({
        where: { name: branch },
      }))!.id,
      startsOn: today,
      principal: await harness.administrator(),
      now: () => now,
    });

    const logged = await run({ branch });

    expect(lineOf(logged, 'Elsa Corte')).toMatchObject({
      action: 'extras_removed',
      extrasRemoved: 40,
    });
    await expect(liveExtras(elsa.courtesySubscriptionId)).resolves.toEqual([
      { classes: 40, reason: 'COURTESY' },
      { classes: -40, reason: 'COURTESY' },
    ]);
    await expect(
      world.prisma.payment.count({ where: { clientId: elsa.clientId } }),
    ).resolves.toBe(2);
  });

  const quarterlyPlanId = async () =>
    (
      await world.prisma.plan.findFirst({
        where: { name: 'Trimestral 36 clases' },
      })
    )?.id;
});
