import { createPrismaAccountClosure } from '../../src/booking/account-closure/prisma-account-closure';
import {
  closureNow,
  closurePassword,
  ClosureWorld,
  startClosureWorld,
} from './account-closure-test-support';

// FIX-004, review H9: a voided sale keeps its decision final, but closing
// the Account still erases the NIT or CI and the name she gave for it.
// A confirmed cash sale with its Subscription, then voided: the shape a
// real void leaves (the sale needs its Subscription to be confirmed).
const seedVoidedInvoicedSale = async (
  world: ClosureWorld,
  clientId: string,
  invoiceName: string,
) => {
  const plan = await world.prisma.plan.findFirstOrThrow({
    orderBy: { displayOrder: 'asc' },
  });
  const branch = await world.prisma.branch.findFirstOrThrow();
  const startsOn = new Date('2026-09-21T00:00:00.000Z');
  return world.prisma.$transaction(async (transaction) => {
    const payment = await transaction.payment.create({
      data: {
        clientId,
        planId: plan.id,
        planNameSnapshot: plan.name,
        durationDaysSnapshot: plan.durationDays,
        classAllowanceSnapshot: plan.classAllowance,
        planPriceCentavos: plan.priceCentavos,
        creditAppliedCentavos: 0,
        amountDueCentavos: plan.priceCentavos,
        startsOn,
        method: 'CASH',
        state: 'CONFIRMED',
        collectedAtBranchId: branch.id,
        submittedByAccountId: world.administrator.accountId,
        submittedAt: closureNow,
        decidedByAccountId: world.administrator.accountId,
        decidedAt: closureNow,
        invoiceTaxId: '1020304050',
        invoiceName,
        createdAt: closureNow,
      },
      select: { id: true },
    });
    await transaction.subscription.create({
      data: {
        clientId,
        planId: plan.id,
        paymentId: payment.id,
        planNameSnapshot: plan.name,
        durationDaysSnapshot: plan.durationDays,
        originalClassAllowance: plan.classAllowance,
        remainingClassAllowance: plan.classAllowance,
        startsOn,
        endsOn: new Date('2026-09-20T00:00:00.000Z'),
        endedByVoid: true,
        activatedAt: closureNow,
      },
    });
    await transaction.payment.update({
      where: { id: payment.id },
      data: {
        state: 'VOIDED',
        voidedAt: closureNow,
        voidedByAccountId: world.administrator.accountId,
        voidReason: 'Cobro duplicado',
      },
    });
    return payment;
  });
};

describe('closing an Account with a voided invoiced sale (PostgreSQL)', () => {
  let world: ClosureWorld;

  beforeAll(async () => {
    world = await startClosureWorld();
  });

  afterAll(async () => {
    await world?.stop();
  });

  it('erases the invoice data of a voided sale and closes the Account', async () => {
    const ana = await world.newClient('Ana con venta anulada', {
      subscription: false,
    });
    const voided = await seedVoidedInvoicedSale(
      world,
      ana.clientId,
      'Ana Justiniano',
    );

    await createPrismaAccountClosure(world.prisma, {
      now: () => closureNow,
    }).close(
      { clientId: ana.clientId, password: closurePassword },
      ana.principal,
    );

    await expect(
      world.prisma.payment.findUniqueOrThrow({ where: { id: voided.id } }),
    ).resolves.toMatchObject({
      state: 'VOIDED',
      voidReason: 'Cobro duplicado',
      invoiceTaxId: null,
      invoiceName: null,
    });
  });

  it('still refuses any other change to a voided sale', async () => {
    const bea = await world.newClient('Bea', { subscription: false });
    const voided = await seedVoidedInvoicedSale(world, bea.clientId, 'Bea');

    await expect(
      world.prisma.payment.update({
        where: { id: voided.id },
        data: { invoiceTaxId: null, invoiceName: null, voidReason: 'Otra' },
      }),
    ).rejects.toThrow(/payment decision is final/);
  });
});
