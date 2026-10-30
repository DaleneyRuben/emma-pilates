import { randomUUID } from 'node:crypto';
import { PrismaClient } from '../../src/generated/prisma/client';
import { PrismaBookingCommands } from '../../src/booking/commands/prisma-booking-commands';
import { openGuestPass } from '../../src/booking/payments/open-guest-pass';
import { createPrismaCourtesyAccess } from '../../src/booking/payments/prisma-courtesy-access';
import { recordAllowanceAdjustment } from '../../src/booking/payments/allowance-adjustments';
import { createSubscriptionReminderJob } from '../../src/notifications/subscription-reminder-job';
import { createFixture } from './booking-command-test-support';
import {
  codeOf,
  fixtures,
  now,
  PaymentWorld,
  plan,
  startPaymentWorld,
} from './payment-lifecycle-test-support';

const date = (civil: string) => new Date(`${civil}T00:00:00.000Z`);

// FIX-002: the review's purchase and renewal findings (H5, H6, H14, H17 and
// the medium ones on renewal, Courtesy Access, and the renewal reminder).
describe('purchase and renewal fixes', () => {
  let world: PaymentWorld;
  let prisma: PrismaClient;

  beforeAll(async () => {
    world = await startPaymentWorld();
    ({ prisma } = world);
  });

  afterAll(async () => {
    await world?.stop();
  });

  const centro = () =>
    fixtures.branches.find((branch) => branch.name === 'Centro')!;
  const assistant = () => world.staffPrincipal('camila.rojas@example.com');
  const administrator = () => world.staffPrincipal('paola.mendoza@example.com');

  const currentPlan = (
    clientId: string,
    terms: { startsOn: string; endsOn: string; remaining: number },
  ) =>
    prisma.subscription.create({
      data: {
        clientId,
        planId: plan.id,
        planNameSnapshot: plan.name,
        durationDaysSnapshot: plan.durationDays,
        originalClassAllowance: plan.classAllowance,
        remainingClassAllowance: terms.remaining,
        startsOn: date(terms.startsOn),
        endsOn: date(terms.endsOn),
        activatedAt: now,
      },
      select: { id: true },
    });

  const cash = async (clientId: string, startsOn?: string) =>
    world.commands().recordCashPayment(
      {
        clientId,
        planId: plan.id,
        branchId: centro().id,
        ...(startsOn === undefined ? {} : { startsOn }),
      },
      await assistant(),
      randomUUID(),
    );

  it('keeps a spent Plan in force while a front-desk QR waits, and shortens it only at confirmation (H5)', async () => {
    const buyer = await world.newClient('QR con plan agotado');
    const current = await currentPlan(buyer.clientId, {
      startsOn: '2026-09-11',
      endsOn: '2026-10-01',
      remaining: 0,
    });
    const staff = await assistant();
    const receipt = await world.readyReceipt(staff.accountId);

    const pending = await world.commands().recordFrontDeskTransfer(
      {
        clientId: buyer.clientId,
        planId: plan.id,
        branchId: centro().id,
        imageAssetId: receipt.id,
        startsOn: '2026-09-23',
      },
      staff,
      randomUUID(),
    );

    await expect(
      prisma.subscription.findUniqueOrThrow({ where: { id: current.id } }),
    ).resolves.toMatchObject({ state: 'ACTIVE', endsOn: date('2026-10-01') });

    await world
      .commands()
      .confirmTransfer({ paymentId: pending.id }, await administrator());

    await expect(
      prisma.subscription.findUniqueOrThrow({ where: { id: current.id } }),
    ).resolves.toMatchObject({ state: 'ACTIVE', endsOn: date('2026-09-22') });
  });

  it('confirms a transfer reviewed the day after its Start Date and moves the start to that day (H6)', async () => {
    const buyer = await world.newClient('Compra a las 21:00');
    const intent = await world
      .commands()
      .createPurchaseIntent(
        { planId: plan.id, startsOn: '2026-09-21' },
        buyer,
        randomUUID(),
      );
    const receipt = await world.readyReceipt(buyer.accountId);
    await world
      .commands()
      .attachReceipt(
        { purchaseIntentId: intent.id, imageAssetId: receipt.id },
        buyer,
        randomUUID(),
      );
    const pending = await world
      .commands()
      .submitTransfer({ purchaseIntentId: intent.id }, buyer, randomUUID());

    const nextMorning = new Date('2026-09-22T13:00:00.000Z');
    await world
      .commands(nextMorning)
      .confirmTransfer({ paymentId: pending.id }, await administrator());

    await expect(
      prisma.subscription.findFirstOrThrow({
        where: { paymentId: pending.id },
      }),
    ).resolves.toMatchObject({
      startsOn: date('2026-09-22'),
      endsOn: date('2026-10-21'),
    });
    const moved = await prisma.auditRecord.findFirstOrThrow({
      where: { actionCode: 'payment.start_date_moved', targetId: pending.id },
    });
    expect(moved.metadata).toMatchObject({
      soldStartsOn: '2026-09-21',
      startsOn: '2026-09-22',
    });
  });

  it('keeps a founder place when her transfer is confirmed late (H6)', async () => {
    await prisma.founderMembership.updateMany({
      where: { deletedAt: null },
      data: { deletedAt: now },
    });
    const founder = await world.newClient('Fundadora revisada tarde');
    await cash(founder.clientId);
    await prisma.subscription.updateMany({
      where: { clientId: founder.clientId },
      data: { startsOn: date('2026-08-27'), endsOn: date('2026-09-25') },
    });
    const intent = await world
      .commands()
      .createPurchaseIntent({ planId: plan.id }, founder, randomUUID());
    const receipt = await world.readyReceipt(founder.accountId);
    await world
      .commands()
      .attachReceipt(
        { purchaseIntentId: intent.id, imageAssetId: receipt.id },
        founder,
        randomUUID(),
      );
    const pending = await world
      .commands()
      .submitTransfer({ purchaseIntentId: intent.id }, founder, randomUUID());
    expect(pending.startsOn).toBe('2026-09-26');

    await world
      .commands(new Date('2026-10-05T13:00:00.000Z'))
      .confirmTransfer({ paymentId: pending.id }, await administrator());

    await expect(
      prisma.founderMembership.findFirstOrThrow({
        where: { clientId: founder.clientId, deletedAt: null },
      }),
    ).resolves.toMatchObject({ status: 'ACTIVE' });
  });

  it('treats a renewal with extra classes left as one that still holds (H14)', async () => {
    const buyer = await world.newClient('Con clases extra');
    const current = await currentPlan(buyer.clientId, {
      startsOn: '2026-09-11',
      endsOn: '2026-10-01',
      remaining: 0,
    });
    const author = await administrator();
    await prisma.$transaction((transaction) =>
      recordAllowanceAdjustment(transaction, {
        subscriptionId: current.id,
        clientId: buyer.clientId,
        classes: 2,
        reason: 'campaign',
        author: { accountId: author.accountId, role: 'ADMINISTRATOR' },
        now,
        correlationId: randomUUID(),
      }),
    );

    const renewal = await cash(buyer.clientId, '2026-09-21');

    expect(renewal.startsOn).toBe('2026-10-02');
    await expect(
      prisma.subscription.findUniqueOrThrow({ where: { id: current.id } }),
    ).resolves.toMatchObject({ state: 'ACTIVE', endsOn: date('2026-10-01') });
  });

  it('starts a friend’s paid Plan on her chosen date, not after her guest pass (H17)', async () => {
    const fixture = await createFixture(prisma, { now });
    const host = await world.newClient('Anfitriona');
    const friend = await world.newClient('Invitada que compra');
    const opened = new Date('2026-09-18T15:00:00.000Z');
    await prisma.$transaction((transaction) =>
      openGuestPass(transaction, {
        hostClientId: host.clientId,
        friendClientId: friend.clientId,
        authorAccountId: fixture.accountId,
        now: opened,
      }),
    );
    await new PrismaBookingCommands(prisma, () => now).create(
      { sessionId: fixture.sessionId },
      friend,
    );

    const sale = await cash(friend.clientId, '2026-09-21');

    expect(sale.startsOn).toBe('2026-09-21');
    const pass = await prisma.guestPass.findFirstOrThrow({
      where: { friendClientId: friend.clientId },
      select: { courtesySubscription: { select: { endsOn: true } } },
    });
    expect(pass.courtesySubscription.endsOn).toEqual(date('2026-09-20'));
    // Open question (backlog FIX-002): the booked guest class stays booked on
    // the ended pass.
    await expect(
      prisma.booking.findFirstOrThrow({
        where: { sessionId: fixture.sessionId },
        select: { state: true },
      }),
    ).resolves.toMatchObject({ state: 'BOOKED' });
  });

  it('renews a spent Plan on the day it started instead of failing (500)', async () => {
    const buyer = await world.newClient('Agotado el mismo día');
    const current = await currentPlan(buyer.clientId, {
      startsOn: '2026-09-21',
      endsOn: '2026-10-20',
      remaining: 0,
    });

    const renewal = await cash(buyer.clientId, '2026-09-21');

    expect(renewal.startsOn).toBe('2026-09-21');
    await expect(
      prisma.subscription.findUniqueOrThrow({ where: { id: current.id } }),
    ).resolves.toMatchObject({ state: 'EXPIRED', endsOn: date('2026-10-20') });
    await expect(
      prisma.auditRecord.findFirst({
        where: { actionCode: 'subscription.ended_early', targetId: current.id },
      }),
    ).resolves.toMatchObject({ correlationId: renewal.id });
  });

  it('refuses Courtesy Access that ends before it starts with a clear error', async () => {
    const tester = await world.newClient('Acceso al revés');
    const access = createPrismaCourtesyAccess(prisma, { now: () => now });

    await expect(
      codeOf(
        access.grant(
          {
            clientId: tester.clientId,
            startsOn: date('2026-09-25'),
            endsOn: date('2026-09-23'),
          },
          await administrator(),
          randomUUID(),
        ),
      ),
    ).resolves.toBe('courtesy_end_date_invalid');
  });

  it('reminds only a real Plan that has not been renewed', async () => {
    const plain = await world.newClient('Recordar');
    const renewed = await world.newClient('Ya renovó');
    const tester = await world.newClient('Cortesía');
    await currentPlan(plain.clientId, {
      startsOn: '2026-08-24',
      endsOn: '2026-09-23',
      remaining: 3,
    });
    await currentPlan(renewed.clientId, {
      startsOn: '2026-08-24',
      endsOn: '2026-09-23',
      remaining: 3,
    });
    await cash(renewed.clientId);
    const queuedTester = await world.newClient('Cortesía en cola');
    await currentPlan(queuedTester.clientId, {
      startsOn: '2026-08-24',
      endsOn: '2026-09-23',
      remaining: 3,
    });
    await createPrismaCourtesyAccess(prisma, { now: () => now }).grant(
      {
        clientId: queuedTester.clientId,
        startsOn: date('2026-09-24'),
        endsOn: date('2026-10-20'),
      },
      await administrator(),
      randomUUID(),
    );
    await createPrismaCourtesyAccess(prisma, { now: () => now }).grant(
      { clientId: tester.clientId, endsOn: date('2026-09-23') },
      await administrator(),
      randomUUID(),
    );

    await createSubscriptionReminderJob(prisma, () => now).execute();

    const reminded = await prisma.notification.findMany({
      where: {
        type: 'subscription_expiring',
        accountId: {
          in: [
            plain.accountId,
            renewed.accountId,
            tester.accountId,
            queuedTester.accountId,
          ],
        },
      },
      select: { accountId: true },
    });
    expect(reminded.map((row) => row.accountId).sort()).toEqual(
      [plain.accountId, queuedTester.accountId].sort(),
    );
  });
});
