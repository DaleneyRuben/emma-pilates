import { randomUUID } from 'node:crypto';
import { PrismaClient } from '../../src/generated/prisma/client';
import { createPrismaOversight } from '../../src/booking/administration/prisma-oversight';
import { createPrismaCourtesyAccess } from '../../src/booking/payments/prisma-courtesy-access';
import { createFounderMembershipJob } from '../../src/booking/payments/founder-membership-job';
import { AdministrationError } from '../../src/booking/administration/administration-errors';
import {
  fixtures,
  now,
  PaymentWorld,
  plan,
  startPaymentWorld,
} from './payment-lifecycle-test-support';

const singleClass = {
  name: 'Clase suelta',
  durationDays: 30,
  classAllowance: 1,
  priceCentavos: 8_000,
  displayOrder: 90,
};

describe('founder membership', () => {
  let world: PaymentWorld;
  let prisma: PrismaClient;

  beforeAll(async () => {
    world = await startPaymentWorld();
    ({ prisma } = world);
    await prisma.plan.create({ data: singleClass });
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

  it('gives the first 40 distinct Clients a place and the 41st none', async () => {
    const buyers = await Promise.all(
      Array.from({ length: 41 }, (_, index) =>
        world.newClient(`Fundadora ${index + 1}`),
      ),
    );

    for (const buyer of buyers.slice(0, 40)) {
      await cash(buyer.clientId, plan.id);
    }
    await cash(buyers[40].clientId, plan.id);

    const memberships = await prisma.founderMembership.findMany({
      orderBy: { number: 'asc' },
    });
    expect(memberships).toHaveLength(40);
    expect(memberships.map((membership) => membership.number)).toEqual(
      Array.from({ length: 40 }, (_, index) => index + 1),
    );
    expect(
      memberships.some(
        (membership) => membership.clientId === buyers[40].clientId,
      ),
    ).toBe(false);

    const granted = await prisma.founderMembership.findFirstOrThrow({
      where: { clientId: buyers[0].clientId },
    });
    const grantedPayment = await prisma.payment.findFirstOrThrow({
      where: { clientId: buyers[0].clientId, state: 'CONFIRMED' },
    });
    expect(granted.paymentId).toBe(grantedPayment.id);
    expect(
      await prisma.auditRecord.count({
        where: {
          actionCode: 'founder_membership.granted',
          targetId: granted.id,
          correlationId: grantedPayment.id,
        },
      }),
    ).toBe(1);

    const first = await prisma.payment.findFirstOrThrow({
      where: { clientId: buyers[0].clientId, state: 'CONFIRMED' },
    });
    expect(first).toMatchObject({
      planPriceCentavos: plan.priceCentavos,
      discountCentavos: 8_400,
      discountReason: 'founder',
      amountDueCentavos: 47_600,
    });
  });

  it('discounts a later Plan by 15 percent and never the single class', async () => {
    const founder = await prisma.founderMembership.findFirstOrThrow({
      where: { number: 1 },
    });
    await prisma.subscription.updateMany({
      where: { clientId: founder.clientId },
      data: { state: 'EXPIRED', expiredAt: now },
    });
    const dropIn = await prisma.plan.findFirstOrThrow({
      where: { name: singleClass.name },
    });

    const renewal = await cash(founder.clientId, plan.id);
    expect(renewal).toMatchObject({
      planPriceCentavos: 56_000,
      discountCentavos: 8_400,
      discountReason: 'founder',
      amountDueCentavos: 47_600,
    });

    const single = await cash(founder.clientId, dropIn.id);
    expect(single).toMatchObject({
      planPriceCentavos: 8_000,
      discountCentavos: 0,
      discountReason: null,
      amountDueCentavos: 8_000,
    });
  });

  it('gives Courtesy Access no place', async () => {
    const guest = await world.newClient('Cortesía');
    const administrator = await world.staffPrincipal(
      'paola.mendoza@example.com',
    );
    await createPrismaCourtesyAccess(prisma, { now: () => now }).grant(
      {
        clientId: guest.clientId,
        endsOn: new Date('2026-10-21T00:00:00.000Z'),
      },
      administrator,
      randomUUID(),
    );

    await expect(
      prisma.founderMembership.findFirst({
        where: { clientId: guest.clientId },
      }),
    ).resolves.toBeNull();
    await expect(prisma.founderMembership.count()).resolves.toBe(40);
  });

  it('never hands the same number twice when two Payments confirm at once', async () => {
    await prisma.founderMembership.updateMany({
      data: { deletedAt: now },
    });
    const before = await prisma.founderMembership.aggregate({
      _max: { number: true },
    });
    const [left, right] = await Promise.all([
      world.newClient('Carrera izquierda'),
      world.newClient('Carrera derecha'),
    ]);

    await Promise.all([
      cash(left.clientId, plan.id),
      cash(right.clientId, plan.id),
    ]);

    const numbers = await prisma.founderMembership.findMany({
      where: { clientId: { in: [left.clientId, right.clientId] } },
      orderBy: { number: 'asc' },
      select: { number: true },
    });
    const next = (before._max.number ?? 0) + 1;
    expect(numbers.map((membership) => membership.number)).toEqual([
      next,
      next + 1,
    ]);
  });

  it('ends a gap of 8 days, keeps a gap of 7, and does nothing the second night', async () => {
    await prisma.founderMembership.updateMany({
      data: { deletedAt: now },
    });
    const lapsed = await world.newClient('Con hueco');
    const kept = await world.newClient('A tiempo');
    await cash(lapsed.clientId, plan.id);
    await cash(kept.clientId, plan.id);
    await prisma.subscription.updateMany({
      where: { clientId: lapsed.clientId },
      data: { endsOn: new Date('2026-10-14T00:00:00.000Z') },
    });
    await prisma.subscription.updateMany({
      where: { clientId: kept.clientId },
      data: { endsOn: new Date('2026-10-16T00:00:00.000Z') },
    });

    const job = createFounderMembershipJob(
      prisma,
      () => new Date('2026-10-23T15:00:00.000Z'),
    );
    await expect(job.execute()).resolves.toEqual({ ended: 1 });
    await expect(job.execute()).resolves.toEqual({ ended: 0 });

    const lost = await prisma.founderMembership.findFirstOrThrow({
      where: { clientId: lapsed.clientId },
    });
    expect(lost.status).toBe('LOST');
    expect(lost.reason).toBe('gap');
    await expect(
      prisma.founderMembership.findFirstOrThrow({
        where: { clientId: kept.clientId },
      }),
    ).resolves.toMatchObject({ status: 'ACTIVE' });
    await expect(
      prisma.auditRecord.count({
        where: { actionCode: 'founder_membership.lost', targetId: lost.id },
      }),
    ).resolves.toBe(1);
    await expect(
      prisma.notification.count({
        where: { businessEventKey: `founder-membership-lost:${lost.id}` },
      }),
    ).resolves.toBe(1);

    await cash(lapsed.clientId, plan.id);
    await expect(
      prisma.founderMembership.findFirstOrThrow({
        where: { clientId: lapsed.clientId },
      }),
    ).resolves.toMatchObject({ status: 'LOST' });
  });

  it('keeps the place while a pending transfer covers the gap', async () => {
    await prisma.founderMembership.updateMany({
      data: { deletedAt: now },
    });
    const waiting = await world.newClient('Transferencia en revisión');
    await cash(waiting.clientId, plan.id);
    await prisma.subscription.updateMany({
      where: { clientId: waiting.clientId },
      data: {
        endsOn: new Date('2026-10-20T00:00:00.000Z'),
        state: 'EXPIRED',
        expiredAt: now,
      },
    });
    const assistant = await world.staffPrincipal('camila.rojas@example.com');
    const receipt = await world.readyReceipt(assistant.accountId);
    const centro = fixtures.branches.find(
      (branch) => branch.name === 'Centro',
    )!;
    await world
      .commands(new Date('2026-10-22T15:00:00.000Z'))
      .recordFrontDeskTransfer(
        {
          clientId: waiting.clientId,
          planId: plan.id,
          branchId: centro.id,
          imageAssetId: receipt.id,
          startsOn: '2026-10-22',
        },
        assistant,
        randomUUID(),
      );

    const job = createFounderMembershipJob(
      prisma,
      () => new Date('2026-10-29T15:00:00.000Z'),
    );
    await expect(job.execute()).resolves.toEqual({ ended: 0 });
    await expect(
      prisma.founderMembership.findFirstOrThrow({
        where: { clientId: waiting.clientId, deletedAt: null },
      }),
    ).resolves.toMatchObject({ status: 'ACTIVE' });
  });

  it('shows the list price, the discount, and the amount paid', async () => {
    const founder = await world.newClient('Informe');
    await cash(founder.clientId, plan.id);
    const administrator = await world.staffPrincipal(
      'paola.mendoza@example.com',
    );

    const report = await createPrismaOversight(prisma, {
      now: () => now,
    }).incomeReport(
      {
        from: new Date('2026-09-01T00:00:00.000Z'),
        until: new Date('2026-11-01T00:00:00.000Z'),
      },
      administrator,
    );
    const sale = report.sales.find(
      (item) =>
        item.discountReason === 'founder' && item.planPriceCentavos === 56_000,
    );

    expect(sale).toMatchObject({
      planPriceCentavos: 56_000,
      discountCentavos: 8_400,
      amountDueCentavos: 47_600,
    });
    expect(report.listPriceCentavos).toBeGreaterThan(report.totalCentavos);
    expect(report.discountCentavos).toBeGreaterThanOrEqual(8_400);
  });

  it('lists the founders for an Administrator and refuses everyone else', async () => {
    const administrator = await world.staffPrincipal(
      'paola.mendoza@example.com',
    );
    const assistant = await world.staffPrincipal('camila.rojas@example.com');
    const oversight = createPrismaOversight(prisma, { now: () => now });

    const page = await oversight.listFounders(administrator);
    expect(page.places).toBe(40);
    expect(page.granted).toBe(page.items.length);
    expect(page.items.map((item) => item.number)).toEqual(
      [...page.items.map((item) => item.number)].sort(
        (left, right) => left - right,
      ),
    );

    await expect(oversight.listFounders(assistant)).rejects.toBeInstanceOf(
      AdministrationError,
    );
    // IDN-009 adds the coordinator role. Until then the denial is proven by a
    // principal whose role the use case does not recognize.
    const staff = administrator.identity as {
      kind: 'staff';
      staffMemberId: string;
      branchIds: string[];
    };
    const coordinator = {
      ...administrator,
      identity: { ...staff, role: 'coordinator' as 'administrator' },
    };
    await expect(oversight.listFounders(coordinator)).rejects.toBeInstanceOf(
      AdministrationError,
    );
  });
});
