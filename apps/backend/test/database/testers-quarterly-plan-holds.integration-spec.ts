import { randomUUID } from 'node:crypto';
import { boliviaDate, addCivilDays } from '../../src/time/bolivia-time';
import {
  now,
  type PaymentWorld,
  startPaymentWorld,
} from './payment-lifecycle-test-support';
import {
  branch,
  clientLines,
  lineOf,
  testersHarness,
} from './testers-quarterly-plan-test-support';

describe('testers the quarterly Plan sale would refuse', () => {
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

  it('holds a tester with an open purchase, writing nothing for her', async () => {
    const fany = await tester('Fany Compra');
    const plan = await world.prisma.plan.findFirstOrThrow({
      where: { name: 'Trimestral 36 clases' },
    });
    await world
      .commands()
      .createPurchaseIntent({ planId: plan.id }, fany, randomUUID());

    const dry = await run({ branch }, true);
    await expect(run({ branch })).rejects.toThrow('testers_left');

    expect(lineOf(dry, 'Fany Compra')).toMatchObject({
      action: 'blocked',
      reason: 'purchase_intent_open_exists',
    });
    await expect(quarterlyPayment(fany.clientId)).resolves.toBeNull();
    await expect(liveExtras(fany.courtesySubscriptionId)).resolves.toEqual([
      { classes: 40, reason: 'COURTESY' },
    ]);
    // Out of the way for the next cases.
    await world.prisma.purchaseIntent.updateMany({
      where: { clientId: fany.clientId },
      data: { state: 'EXPIRED' },
    });
    await run({ branch });
  });

  it('holds a tester with a class booked ahead, or starts her the day after it, then skips her as paid', async () => {
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
    const classDay = boliviaDate(session.startsAt);
    const civil = (date: Date) => date.toISOString().slice(0, 10);

    await expect(run({ branch })).rejects.toThrow('testers_left');
    await expect(quarterlyPayment(dora.clientId)).resolves.toBeNull();
    await expect(liveExtras(dora.courtesySubscriptionId)).resolves.toEqual([
      { classes: 40, reason: 'COURTESY' },
    ]);

    const dry = await run({ branch, afterBookedClass: true }, true);
    expect(lineOf(dry, 'Dora Reserva')).toMatchObject({
      action: 'move',
      startsOn: civil(addCivilDays(classDay, 1)),
      afterBookedClassOn: civil(classDay),
    });

    const logged = await run({ branch, afterBookedClass: true });
    const payment = await quarterlyPayment(dora.clientId);
    expect(payment!.startsOn).toEqual(addCivilDays(classDay, 1));
    // Her courtesy Plan keeps the class and ends that day.
    await expect(
      courtesySubscription(dora.courtesySubscriptionId),
    ).resolves.toMatchObject({ state: 'ACTIVE', endsOn: classDay });
    expect(lineOf(logged, 'Dora Reserva')).toMatchObject({
      action: 'moved',
      afterBookedClassOn: civil(classDay),
    });

    const rerun = await run({ branch, afterBookedClass: true });
    expect(clientLines(rerun).map((line) => line.fields)).toEqual([
      expect.objectContaining({
        name: 'Dora Reserva',
        action: 'skip',
        reason: 'paid_plan',
      }),
    ]);
  });

  it('needs the Branch named when the studio has several', async () => {
    await expect(run({})).rejects.toThrow('branch_required');
    await expect(run({ branch: 'Nowhere' })).rejects.toThrow('branch_missing');
  });
});
