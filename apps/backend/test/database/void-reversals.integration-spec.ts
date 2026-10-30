import { randomUUID } from 'node:crypto';
import { PrismaClient } from '../../src/generated/prisma/client';
import { createPrismaCashCloses } from '../../src/back-office/cash-close/prisma-cash-closes';
import { openGuestPass } from '../../src/booking/payments/open-guest-pass';
import { createPrismaVoidPayment } from '../../src/booking/payments/prisma-void-payment';
import { auditActorOf } from '../../src/system-identity/authentication/audit-actor';
import {
  fixtures,
  now,
  PaymentWorld,
  plan,
  startPaymentWorld,
} from './payment-lifecycle-test-support';

const founderPlaces = 40;

// FIX-004, owner decisions 3 and 4 (2026-10-28): a void undoes everything
// that came from that sale, each reversal audited, and voided cash stays in
// the day's expected cash.
describe('what a void undoes', () => {
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
  const administrator = () => world.staffPrincipal('paola.mendoza@example.com');

  const cash = async (clientId: string) =>
    world
      .commands()
      .recordCashPayment(
        { clientId, planId: plan.id, branchId: centro().id },
        await world.staffPrincipal('camila.rojas@example.com'),
        randomUUID(),
      );

  const voidSale = async (paymentId: string) => {
    const admin = await administrator();
    return createPrismaVoidPayment(prisma).voidPayment({
      paymentId,
      reason: 'Venta registrada por error',
      actor: auditActorOf(admin),
      now,
    });
  };

  const releasePlaces = () =>
    prisma.founderMembership.updateMany({
      where: { deletedAt: null },
      data: { deletedAt: now },
    });

  // Every place held, so the next buyer is an ordinary Client and gets the
  // gift class.
  const fillPlaces = async () => {
    await releasePlaces();
    const top = await prisma.founderMembership.aggregate({
      _max: { number: true },
    });
    for (let index = 0; index < founderPlaces; index += 1) {
      const holder = await world.newClient(`Fundadora ${index + 1}`);
      await prisma.founderMembership.create({
        data: {
          clientId: holder.clientId,
          number: (top._max.number ?? 0) + index + 1,
          since: now,
        },
      });
    }
  };

  const reversals = (paymentId: string) =>
    prisma.auditRecord.findMany({
      where: {
        correlationId: paymentId,
        NOT: { actionCode: 'payment.voided' },
      },
      select: { actionCode: true, targetId: true },
    });

  it('frees the founder place that sale granted, and audits it', async () => {
    await releasePlaces();
    const founder = await world.newClient('Fundadora anulada');
    const sale = await cash(founder.clientId);
    const place = await prisma.founderMembership.findFirstOrThrow({
      where: { clientId: founder.clientId, deletedAt: null },
    });
    expect(place).toMatchObject({ status: 'ACTIVE', paymentId: sale.id });

    await voidSale(sale.id);

    await expect(
      prisma.founderMembership.findUniqueOrThrow({ where: { id: place.id } }),
    ).resolves.toMatchObject({ deletedAt: now });
    await expect(reversals(sale.id)).resolves.toContainEqual({
      actionCode: 'founder_membership.released',
      targetId: place.id,
    });
  });

  it('removes the unused gift class and the host’s unused invite reward', async () => {
    await fillPlaces();
    const host = await world.newClient('Anfitriona');
    await cash(host.clientId);
    const friend = await world.newClient('Amiga que compra');
    await prisma.$transaction((transaction) =>
      openGuestPass(transaction, {
        hostClientId: host.clientId,
        friendClientId: friend.clientId,
        authorAccountId: host.accountId,
        now,
      }),
    );
    const sale = await cash(friend.clientId);
    const gift = await prisma.allowanceAdjustment.findFirstOrThrow({
      where: { clientId: friend.clientId, reason: 'GIFT_NEW_CLIENT' },
    });
    const reward = await prisma.allowanceAdjustment.findFirstOrThrow({
      where: { clientId: host.clientId, reason: 'INVITE_CONVERTED' },
    });

    await voidSale(sale.id);

    await expect(
      prisma.allowanceAdjustment.findUniqueOrThrow({ where: { id: gift.id } }),
    ).resolves.toMatchObject({ deletedAt: now });
    await expect(
      prisma.allowanceAdjustment.findUniqueOrThrow({
        where: { id: reward.id },
      }),
    ).resolves.toMatchObject({ deletedAt: now });
    await expect(
      prisma.guestPass.findFirstOrThrow({
        where: { friendClientId: friend.clientId },
      }),
    ).resolves.toMatchObject({ rewardedAt: null, rewardSubscriptionId: null });
    const audited = await reversals(sale.id);
    expect(audited).toContainEqual({
      actionCode: 'allowance_adjustment.removed',
      targetId: gift.id,
    });
    expect(audited).toContainEqual({
      actionCode: 'allowance_adjustment.removed',
      targetId: reward.id,
    });
  });

  it('cancels the included Evaluation still ahead and closes her waitlist entries', async () => {
    await fillPlaces();
    const buyer = await world.newClient('Evaluación incluida');
    const sale = await cash(buyer.clientId);
    const subscription = await prisma.subscription.findUniqueOrThrow({
      where: { paymentId: sale.id },
    });
    const slot = await prisma.evaluationSlot.findFirstOrThrow({
      where: {
        state: 'PUBLISHED',
        startsAt: { gt: now },
        evaluations: { none: {} },
      },
      orderBy: { startsAt: 'asc' },
    });
    const evaluation = await prisma.evaluation.create({
      data: {
        clientId: buyer.clientId,
        evaluationSlotId: slot.id,
        eligibilityMonth: slot.localMonth,
        subscriptionId: subscription.id,
        nutritionistCostCentavos: 5_000,
        createdByAccountId: buyer.accountId,
      },
    });
    const session = await prisma.session.findFirstOrThrow({
      where: {
        branchId: centro().id,
        state: 'SCHEDULED',
        startsAt: { gt: now, lt: subscription.endsOn },
      },
      orderBy: { startsAt: 'asc' },
    });
    const entry = await prisma.waitlistEntry.create({
      data: {
        sessionId: session.id,
        clientId: buyer.clientId,
        joinedByAccountId: buyer.accountId,
        joinedAt: now,
      },
    });

    await voidSale(sale.id);

    await expect(
      prisma.evaluation.findUniqueOrThrow({ where: { id: evaluation.id } }),
    ).resolves.toMatchObject({
      state: 'CANCELLED',
      cancellationCause: 'PAYMENT_VOIDED',
    });
    await expect(
      prisma.waitlistEntry.findUniqueOrThrow({ where: { id: entry.id } }),
    ).resolves.toMatchObject({ closureReason: 'PAYMENT_VOIDED' });
    const audited = await reversals(sale.id);
    expect(audited).toContainEqual({
      actionCode: 'evaluation.cancelled_by_void',
      targetId: evaluation.id,
    });
    expect(audited).toContainEqual({
      actionCode: 'waitlist_entry.closed_by_void',
      targetId: entry.id,
    });
  });

  it('keeps a voided cash sale in the day’s expected cash, on its own line', async () => {
    await fillPlaces();
    const buyer = await world.newClient('Efectivo anulado');
    const camila = await world.staffPrincipal('camila.rojas@example.com');
    const closes = createPrismaCashCloses(prisma, { now: () => now });
    const before = await closes.readToday({ branchId: centro().id }, camila);
    const sale = await cash(buyer.clientId);

    await voidSale(sale.id);

    const after = await closes.readToday({ branchId: centro().id }, camila);
    expect(after.expectedCentavos).toBe(
      before.expectedCentavos + sale.amountDueCentavos,
    );
    expect(after.voidedCashCentavos).toBe(
      (before.voidedCashCentavos ?? 0) + sale.amountDueCentavos,
    );
  });

  it('audits the void with the acting Administrator', async () => {
    await fillPlaces();
    const buyer = await world.newClient('Actor del anulado');
    const sale = await cash(buyer.clientId);
    const admin = await administrator();

    await voidSale(sale.id);

    await expect(
      prisma.auditRecord.findFirstOrThrow({
        where: { actionCode: 'payment.voided', targetId: sale.id },
      }),
    ).resolves.toMatchObject({
      actorAccountId: admin.accountId,
      actorRole: 'ADMINISTRATOR',
      impersonationId: null,
    });
  });
});
