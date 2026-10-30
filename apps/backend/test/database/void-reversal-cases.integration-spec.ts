import { randomUUID } from 'node:crypto';
import { PrismaClient } from '../../src/generated/prisma/client';
import { openGuestPass } from '../../src/booking/payments/open-guest-pass';
import { createPrismaVoidPayment } from '../../src/booking/payments/prisma-void-payment';
import { recordAllowanceAdjustment } from '../../src/booking/payments/allowance-adjustments';
import { auditActorOf } from '../../src/system-identity/authentication/audit-actor';
import {
  fixtures,
  now,
  PaymentWorld,
  plan,
  startPaymentWorld,
} from './payment-lifecycle-test-support';

// FIX-004 review: the cases around a void that the first cut got wrong — a
// reward earned by the friend but held on the host's voided sale, a sale
// recorded twice and voided once, and what was already used.
describe('a void, case by case', () => {
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

  const cash = async (clientId: string, at: Date = now) =>
    world
      .commands(at)
      .recordCashPayment(
        { clientId, planId: plan.id, branchId: centro().id },
        await world.staffPrincipal('camila.rojas@example.com'),
        randomUUID(),
      );

  const voidSale = async (paymentId: string, at: Date = now) =>
    createPrismaVoidPayment(prisma).voidPayment({
      paymentId,
      reason: 'Venta registrada por error',
      actor: auditActorOf(
        await world.staffPrincipal('paola.mendoza@example.com'),
      ),
      now: at,
    });

  const releasePlaces = () =>
    prisma.founderMembership.updateMany({
      where: { deletedAt: null },
      data: { deletedAt: now },
    });

  const fillPlaces = async () => {
    await releasePlaces();
    const top = await prisma.founderMembership.aggregate({
      _max: { number: true },
    });
    for (let index = 0; index < 40; index += 1) {
      const holder = await world.newClient(`Lugar ${index + 1}`);
      await prisma.founderMembership.create({
        data: {
          clientId: holder.clientId,
          number: (top._max.number ?? 0) + index + 1,
          since: now,
        },
      });
    }
  };

  const invite = async () => {
    const host = await world.newClient('Anfitriona sin plan');
    const friend = await world.newClient('Amiga');
    await prisma.$transaction((transaction) =>
      openGuestPass(transaction, {
        hostClientId: host.clientId,
        friendClientId: friend.clientId,
        authorAccountId: host.accountId,
        now,
      }),
    );
    return { host, friend };
  };

  const pass = (friendClientId: string) =>
    prisma.guestPass.findFirstOrThrow({
      where: { friendClientId },
      select: {
        rewardOwed: true,
        rewardedAt: true,
        rewardSubscriptionId: true,
      },
    });

  it('owes the host her reward again when her own sale that collected it is voided', async () => {
    await fillPlaces();
    const { host, friend } = await invite();
    // The friend buys while the host has no Plan: the class is owed.
    await cash(friend.clientId);
    expect(await pass(friend.clientId)).toMatchObject({ rewardOwed: true });
    // The host buys: her Plan collects it.
    const hostSale = await cash(host.clientId);
    const reward = await prisma.allowanceAdjustment.findFirstOrThrow({
      where: { clientId: host.clientId, reason: 'INVITE_CONVERTED' },
    });

    await voidSale(hostSale.id);

    await expect(pass(friend.clientId)).resolves.toMatchObject({
      rewardOwed: true,
      rewardedAt: null,
      rewardSubscriptionId: null,
    });
    await expect(
      prisma.allowanceAdjustment.findUniqueOrThrow({
        where: { id: reward.id },
      }),
    ).resolves.toMatchObject({ deletedAt: now });
  });

  it('takes back a reward the host collected when the friend’s sale is voided', async () => {
    await fillPlaces();
    const { host, friend } = await invite();
    const friendSale = await cash(friend.clientId);
    await cash(host.clientId);
    const reward = await prisma.allowanceAdjustment.findFirstOrThrow({
      where: { clientId: host.clientId, reason: 'INVITE_CONVERTED' },
    });

    await voidSale(friendSale.id);

    await expect(
      prisma.allowanceAdjustment.findUniqueOrThrow({
        where: { id: reward.id },
      }),
    ).resolves.toMatchObject({ deletedAt: now });
    await expect(pass(friend.clientId)).resolves.toMatchObject({
      rewardOwed: false,
      rewardedAt: null,
    });
  });

  it('keeps the founder place and the gift when the same sale was recorded twice', async () => {
    await releasePlaces();
    const founder = await world.newClient('Fundadora cobrada dos veces');
    const first = await cash(founder.clientId);
    const second = await cash(founder.clientId);

    await voidSale(first.id);

    await expect(
      prisma.founderMembership.findFirstOrThrow({
        where: { clientId: founder.clientId, deletedAt: null },
      }),
    ).resolves.toMatchObject({ status: 'ACTIVE', paymentId: second.id });

    await fillPlaces();
    const ordinary = await world.newClient('Ordinaria cobrada dos veces');
    const once = await cash(ordinary.clientId);
    const twice = await cash(ordinary.clientId);
    const secondPlan = await prisma.subscription.findUniqueOrThrow({
      where: { paymentId: twice.id },
    });

    await voidSale(once.id);

    await expect(
      prisma.allowanceAdjustment.findMany({
        where: {
          clientId: ordinary.clientId,
          reason: 'GIFT_NEW_CLIENT',
          deletedAt: null,
        },
        select: { subscriptionId: true },
      }),
    ).resolves.toEqual([{ subscriptionId: secondPlan.id }]);
  });

  it('keeps a gift already used and an Evaluation already held', async () => {
    await fillPlaces();
    const buyer = await world.newClient('Ya usó su regalo');
    const sale = await cash(buyer.clientId);
    const subscription = await prisma.subscription.findUniqueOrThrow({
      where: { paymentId: sale.id },
    });
    const gift = await prisma.allowanceAdjustment.findFirstOrThrow({
      where: { clientId: buyer.clientId, reason: 'GIFT_NEW_CLIENT' },
    });
    const admin = await world.staffPrincipal('paola.mendoza@example.com');
    await prisma.$transaction((transaction) =>
      recordAllowanceAdjustment(transaction, {
        subscriptionId: subscription.id,
        clientId: buyer.clientId,
        classes: -1,
        reason: 'consumption',
        author: { accountId: admin.accountId, role: 'ADMINISTRATOR' },
        now,
        correlationId: randomUUID(),
      }),
    );
    const heldSlot = await prisma.evaluationSlot.findFirstOrThrow({
      where: {
        state: 'PUBLISHED',
        startsAt: { gt: now },
        evaluations: { none: {} },
      },
      orderBy: { startsAt: 'asc' },
    });
    const held = await prisma.evaluation.create({
      data: {
        clientId: buyer.clientId,
        evaluationSlotId: heldSlot.id,
        eligibilityMonth: heldSlot.localMonth,
        subscriptionId: subscription.id,
        nutritionistCostCentavos: 5_000,
        createdByAccountId: buyer.accountId,
        createdAt: now,
      },
    });

    // The void comes after the Evaluation was held.
    await voidSale(
      sale.id,
      new Date(heldSlot.startsAt.getTime() + 2 * 60 * 60 * 1_000),
    );

    await expect(
      prisma.allowanceAdjustment.findUniqueOrThrow({ where: { id: gift.id } }),
    ).resolves.toMatchObject({ deletedAt: null });
    await expect(
      prisma.evaluation.findUniqueOrThrow({ where: { id: held.id } }),
    ).resolves.toMatchObject({ state: 'BOOKED' });
  });
});
