import { randomUUID } from 'node:crypto';
import { PrismaClient } from '../../src/generated/prisma/client';
import { createPrismaCampaignGrant } from '../../src/booking/payments/prisma-campaign-grant';
import { createPrismaCourtesyAccess } from '../../src/booking/payments/prisma-courtesy-access';
import {
  fixtures,
  now,
  PaymentWorld,
  plan,
  startPaymentWorld,
} from './payment-lifecycle-test-support';

const day = 24 * 60 * 60 * 1_000;
const founderDiscountCentavos = 8_400;

describe('founder review fixes', () => {
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

  const cash = async (
    clientId: string,
    planId: string = plan.id,
    startsOn?: string,
  ) => {
    const assistant = await world.staffPrincipal('camila.rojas@example.com');
    return world.commands().recordCashPayment(
      {
        clientId,
        planId,
        branchId: centro().id,
        ...(startsOn === undefined ? {} : { startsOn }),
      },
      assistant,
      randomUUID(),
    );
  };

  const administrator = () => world.staffPrincipal('paola.mendoza@example.com');

  it('discounts a founder first cash sale and grants no gift class', async () => {
    const founder = await world.newClient('Primera fundadora');
    const ordinary = await world.newClient('Primera ordinaria');

    const founderSale = await cash(founder.clientId);
    await cash(ordinary.clientId);

    expect(founderSale).toMatchObject({
      planPriceCentavos: plan.priceCentavos,
      discountCentavos: founderDiscountCentavos,
      discountReason: 'founder',
      amountDueCentavos: plan.priceCentavos - founderDiscountCentavos,
    });
    await expect(
      prisma.founderMembership.findFirst({
        where: { clientId: founder.clientId, deletedAt: null },
      }),
    ).resolves.toMatchObject({ status: 'ACTIVE' });
    await expect(
      prisma.allowanceAdjustment.count({
        where: { clientId: founder.clientId, reason: 'GIFT_NEW_CLIENT' },
      }),
    ).resolves.toBe(0);
    await expect(
      prisma.allowanceAdjustment.count({
        where: { clientId: ordinary.clientId, reason: 'GIFT_NEW_CLIENT' },
      }),
    ).resolves.toBe(1);
  });

  it('charges list price once 40 places are held', async () => {
    const held = await prisma.founderMembership.count({
      where: { deletedAt: null },
    });
    const extras = Array.from({ length: 40 - held }, (_, index) =>
      world.newClient(`Lugar ${held + index + 1}`),
    );
    for (const buyer of await Promise.all(extras)) {
      await cash(buyer.clientId);
    }

    const fortyFirst = await world.newClient('Lugar 41');
    const sale = await cash(fortyFirst.clientId);

    expect(sale).toMatchObject({
      discountCentavos: 0,
      discountReason: null,
      amountDueCentavos: plan.priceCentavos,
    });
    await expect(
      prisma.founderMembership.findFirst({
        where: { clientId: fortyFirst.clientId },
      }),
    ).resolves.toBeNull();
  });

  it('prices a front-desk QR as founder before the Administrator confirms', async () => {
    const buyer = await world.newClient('QR recepción');
    const assistant = await world.staffPrincipal('camila.rojas@example.com');
    const receipt = await world.readyReceipt(assistant.accountId);

    const pending = await world.commands().recordFrontDeskTransfer(
      {
        clientId: buyer.clientId,
        planId: plan.id,
        branchId: centro().id,
        imageAssetId: receipt.id,
      },
      assistant,
      randomUUID(),
    );

    expect(pending).toMatchObject({
      state: 'pending',
      method: 'transfer',
      planPriceCentavos: plan.priceCentavos,
      discountCentavos: founderDiscountCentavos,
      discountReason: 'founder',
      amountDueCentavos: plan.priceCentavos - founderDiscountCentavos,
    });
    await expect(
      prisma.founderMembership.findFirst({
        where: { clientId: buyer.clientId, deletedAt: null },
      }),
    ).resolves.toMatchObject({ status: 'RESERVED' });
  });

  it('keeps the discount across 7 uncovered days and loses it across 8', async () => {
    const kept = await world.newClient('Hueco de 7');
    const lost = await world.newClient('Hueco de 8');
    await cash(kept.clientId);
    await cash(lost.clientId);
    const keptEnd = new Date('2026-09-14T00:00:00.000Z');
    const lostEnd = new Date('2026-09-13T00:00:00.000Z');
    await prisma.subscription.updateMany({
      where: { clientId: kept.clientId },
      data: {
        state: 'EXPIRED',
        expiredAt: now,
        startsOn: new Date(keptEnd.getTime() - 29 * day),
        endsOn: keptEnd,
      },
    });
    await prisma.subscription.updateMany({
      where: { clientId: lost.clientId },
      data: {
        state: 'EXPIRED',
        expiredAt: now,
        startsOn: new Date(lostEnd.getTime() - 29 * day),
        endsOn: lostEnd,
      },
    });

    const keptSale = await cash(kept.clientId, plan.id, '2026-09-22');
    const lostSale = await cash(lost.clientId, plan.id, '2026-09-22');

    expect(keptSale).toMatchObject({
      discountCentavos: founderDiscountCentavos,
      discountReason: 'founder',
    });
    await expect(
      prisma.founderMembership.findFirstOrThrow({
        where: { clientId: kept.clientId, deletedAt: null },
      }),
    ).resolves.toMatchObject({ status: 'ACTIVE' });
    expect(lostSale).toMatchObject({
      discountCentavos: 0,
      discountReason: null,
      amountDueCentavos: plan.priceCentavos,
    });
    await expect(
      prisma.founderMembership.findFirstOrThrow({
        where: { clientId: lost.clientId },
      }),
    ).resolves.toMatchObject({ status: 'LOST' });
    await expect(
      prisma.auditRecord.count({
        where: {
          actionCode: 'founder_membership.lost',
          targetId: (
            await prisma.founderMembership.findFirstOrThrow({
              where: { clientId: lost.clientId },
              select: { id: true },
            })
          ).id,
        },
      }),
    ).resolves.toBe(1);
  });

  it('grants a campaign only to an ordinary live Client', async () => {
    const ordinary = await world.newClient('Campaña viva');
    const founder = await world.newClient('Campaña fundadora');
    const courtesy = await world.newClient('Campaña cortesía');
    const hidden = await world.newClient('Campaña oculta');
    const free = await world.newClient('Campaña gratis');
    await cash(ordinary.clientId);
    await cash(founder.clientId);
    await createPrismaCourtesyAccess(prisma, { now: () => now }).grant(
      {
        clientId: courtesy.clientId,
        endsOn: new Date(now.getTime() + 30 * day),
      },
      await administrator(),
      randomUUID(),
    );
    const hiddenPlan = await prisma.plan.create({
      data: {
        name: `Oculto ${randomUUID().slice(0, 8)}`,
        durationDays: 30,
        classAllowance: 8,
        priceCentavos: 56_000,
        displayOrder: 80,
        hiddenAt: now,
      },
    });
    const freePlan = await prisma.plan.create({
      data: {
        name: `Gratis ${randomUUID().slice(0, 8)}`,
        durationDays: 30,
        classAllowance: 8,
        priceCentavos: 0,
        displayOrder: 81,
        hiddenAt: now,
      },
    });
    const admin = await prisma.account.findFirstOrThrow({
      where: { email: 'paola.mendoza@example.com', deletedAt: null },
      select: { id: true },
    });
    const cover = async (
      clientId: string,
      catalog: { id: string; name: string; priceCentavos: number },
    ) => {
      await prisma.$transaction(async (transaction) => {
        const payment = await transaction.payment.create({
          data: {
            clientId,
            planId: catalog.id,
            planNameSnapshot: catalog.name,
            durationDaysSnapshot: 30,
            classAllowanceSnapshot: 8,
            planPriceCentavos: catalog.priceCentavos,
            creditAppliedCentavos: 0,
            amountDueCentavos: catalog.priceCentavos,
            startsOn: new Date('2026-09-21T00:00:00.000Z'),
            method: 'COURTESY',
            state: 'CONFIRMED',
            submittedByAccountId: admin.id,
            submittedAt: now,
            decidedByAccountId: admin.id,
            decidedAt: now,
            createdAt: now,
          },
        });
        await transaction.subscription.create({
          data: {
            clientId,
            planId: catalog.id,
            paymentId: payment.id,
            planNameSnapshot: catalog.name,
            durationDaysSnapshot: 30,
            originalClassAllowance: 8,
            remainingClassAllowance: 8,
            startsOn: new Date('2026-09-21T00:00:00.000Z'),
            endsOn: new Date('2026-10-20T00:00:00.000Z'),
            state: 'ACTIVE',
            activatedAt: now,
          },
        });
      });
    };
    await cover(hidden.clientId, { ...hiddenPlan, priceCentavos: 0 });
    await cover(free.clientId, freePlan);

    const result = await createPrismaCampaignGrant(prisma, () => now).grant(
      { name: 'Inicio', classes: 1, idempotencyKey: randomUUID() },
      await administrator(),
    );

    expect(result.granted.map((client) => client.clientId)).toContain(
      ordinary.clientId,
    );
    expect(result.granted.map((client) => client.clientId)).not.toContain(
      founder.clientId,
    );
    for (const clientId of [
      founder.clientId,
      courtesy.clientId,
      hidden.clientId,
      free.clientId,
    ]) {
      await expect(
        prisma.allowanceAdjustment.count({
          where: { clientId, reason: 'CAMPAIGN' },
        }),
      ).resolves.toBe(0);
    }
    await expect(
      prisma.allowanceAdjustment.count({
        where: { clientId: ordinary.clientId, reason: 'CAMPAIGN' },
      }),
    ).resolves.toBe(1);
  });

  it('numbers the next place from the highest number, including a removed row', async () => {
    const removed = await prisma.founderMembership.findFirst({
      where: { deletedAt: null },
      orderBy: { number: 'desc' },
    });
    expect(removed).not.toBeNull();
    await prisma.founderMembership.update({
      where: { id: removed!.id },
      data: { deletedAt: now },
    });
    const buyer = await world.newClient('Número siguiente');

    await cash(buyer.clientId);

    await expect(
      prisma.founderMembership.findFirstOrThrow({
        where: { clientId: buyer.clientId, deletedAt: null },
      }),
    ).resolves.toMatchObject({ number: removed!.number + 1 });
  });
});
