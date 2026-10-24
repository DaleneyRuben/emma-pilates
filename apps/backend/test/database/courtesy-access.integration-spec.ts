import { randomUUID } from 'node:crypto';
import { AdministrationError } from '../../src/booking/administration/administration-errors';
import { createPrismaCatalogAdministration } from '../../src/booking/administration/prisma-catalog-administration';
import { createPrismaOversight } from '../../src/booking/administration/prisma-oversight';
import { BookingAccessDeniedError } from '../../src/booking/commands/create-booking';
import { createCatalogRepository } from '../../src/booking/catalog/prisma-catalog-repository';
import { PaymentRuleError } from '../../src/booking/payments/payment-errors';
import { createPrismaCourtesyAccess } from '../../src/booking/payments/prisma-courtesy-access';
import {
  fixtures,
  now,
  type PaymentWorld,
  startPaymentWorld,
  today,
} from './payment-lifecycle-test-support';

const endsOn = new Date('2026-11-30T00:00:00.000Z');

const codeOf = async (work: Promise<unknown>): Promise<string> => {
  try {
    await work;
    return 'resolved';
  } catch (error) {
    if (error instanceof PaymentRuleError) return error.code;
    if (error instanceof AdministrationError) return error.code;
    if (error instanceof BookingAccessDeniedError) return 'access_denied';
    return String(error);
  }
};

describe('Courtesy Access (REL-011)', () => {
  let world: PaymentWorld;
  const access = () =>
    createPrismaCourtesyAccess(world.prisma, { now: () => now });
  const administrator = () => world.staffPrincipal('paola.mendoza@example.com');
  const assistant = () => world.staffPrincipal('camila.rojas@example.com');

  beforeAll(async () => {
    world = await startPaymentWorld();
  });

  afterAll(async () => {
    await world?.stop();
  });

  it('grants the hidden Bs 0 Plan of 16 classes until the chosen date, audited and notified', async () => {
    const admin = await administrator();
    const tester = await world.newClient('Tester Uno');

    const payment = await access().grant(
      { clientId: tester.clientId, endsOn },
      admin,
      randomUUID(),
    );

    expect(payment).toMatchObject({
      method: 'courtesy',
      state: 'confirmed',
      planName: 'Acceso de prueba',
      classAllowance: 16,
      planPriceCentavos: 0,
      creditAppliedCentavos: 0,
      amountDueCentavos: 0,
      decidedAt: now,
    });
    await expect(
      world.prisma.plan.findUniqueOrThrow({ where: { id: payment.planId } }),
    ).resolves.toMatchObject({
      name: 'Acceso de prueba',
      classAllowance: 16,
      priceCentavos: 0,
      hiddenAt: expect.any(Date) as Date,
    });
    await expect(
      world.prisma.subscription.findUniqueOrThrow({
        where: { id: payment.subscriptionId! },
      }),
    ).resolves.toMatchObject({
      clientId: tester.clientId,
      paymentId: payment.id,
      startsOn: today,
      endsOn,
      originalClassAllowance: 16,
      remainingClassAllowance: 16,
      state: 'ACTIVE',
    });
    await expect(
      world.prisma.auditRecord.findFirstOrThrow({
        where: { targetType: 'payment', targetId: payment.id },
      }),
    ).resolves.toMatchObject({
      actionCode: 'payment.courtesy_granted',
      actorAccountId: admin.accountId,
      actorRole: 'ADMINISTRATOR',
      metadata: {
        method: 'courtesy',
        clientId: tester.clientId,
        endsOn: '2026-11-30',
        classAllowance: 16,
      },
    });
    await expect(
      world.prisma.notification.findFirstOrThrow({
        where: { accountId: tester.accountId },
      }),
    ).resolves.toMatchObject({
      type: 'payment_confirmed',
      title: 'Pago confirmado',
      destinationType: 'subscription',
      destinationId: payment.subscriptionId,
    });
  });

  it('reuses one hidden Plan, replays a repeated key, and never qualifies a Referral', async () => {
    const admin = await administrator();
    const referrer = await world.newClient('Referente');
    const tester = await world.newClient('Tester Dos');
    await world.prisma.referral.create({
      data: {
        referrerClientId: referrer.clientId,
        referredClientId: tester.clientId,
      },
    });
    const key = randomUUID();

    const first = await access().grant(
      { clientId: tester.clientId, endsOn },
      admin,
      key,
    );
    const replay = await access().grant(
      { clientId: tester.clientId, endsOn },
      admin,
      key,
    );
    const other = await world.newClient('Tester Tres');
    const second = await access().grant(
      { clientId: other.clientId, endsOn },
      admin,
      randomUUID(),
    );

    expect(replay).toEqual(first);
    expect(second.planId).toBe(first.planId);
    await expect(
      world.prisma.plan.count({ where: { name: 'Acceso de prueba' } }),
    ).resolves.toBe(1);
    await expect(
      world.prisma.payment.count({ where: { clientId: tester.clientId } }),
    ).resolves.toBe(1);
    await expect(
      world.prisma.referral.findFirstOrThrow({
        where: { referredClientId: tester.clientId },
      }),
    ).resolves.toMatchObject({ state: 'PENDING', qualifiedPaymentId: null });
    await expect(
      world.prisma.creditLedgerEntry.count({
        where: { clientId: referrer.clientId },
      }),
    ).resolves.toBe(0);
  });

  it('lets no one but an Administrator grant it', async () => {
    const tester = await world.newClient('Tester Negada');

    await expect(
      codeOf(
        access().grant(
          { clientId: tester.clientId, endsOn },
          await assistant(),
          randomUUID(),
        ),
      ),
    ).resolves.toBe('administration_access_denied');
    await expect(
      codeOf(
        access().grant(
          { clientId: tester.clientId, endsOn },
          tester,
          randomUUID(),
        ),
      ),
    ).resolves.toBe('administration_access_denied');
    await expect(
      world.prisma.payment.count({ where: { clientId: tester.clientId } }),
    ).resolves.toBe(0);
  });

  it('refuses an unknown Client, a past date, and a Client whose Plan is still in use', async () => {
    const admin = await administrator();
    const tester = await world.newClient('Tester Cuatro');

    await expect(
      codeOf(
        access().grant({ clientId: randomUUID(), endsOn }, admin, randomUUID()),
      ),
    ).resolves.toBe('client_not_found');
    await expect(
      codeOf(
        access().grant(
          {
            clientId: tester.clientId,
            endsOn: new Date('2026-09-20T00:00:00.000Z'),
          },
          admin,
          randomUUID(),
        ),
      ),
    ).resolves.toBe('courtesy_end_date_invalid');
    await access().grant(
      { clientId: tester.clientId, endsOn },
      admin,
      randomUUID(),
    );
    await expect(
      codeOf(
        access().grant(
          { clientId: tester.clientId, endsOn },
          admin,
          randomUUID(),
        ),
      ),
    ).resolves.toBe('subscription_not_expired');
  });

  it('keeps the tester Plan out of every catalog and every purchase', async () => {
    const admin = await administrator();
    const tester = await world.newClient('Tester Cinco');
    const granted = await access().grant(
      { clientId: tester.clientId, endsOn },
      admin,
      randomUUID(),
    );
    const buyer = await world.newClient('Compradora');
    const catalog = createCatalogRepository(world.prisma);

    const visible = await catalog.listVisiblePlans();
    expect(visible.map((plan) => plan.id)).not.toContain(granted.planId);
    await expect(catalog.findVisiblePlan(granted.planId)).resolves.toBeNull();
    await expect(
      codeOf(
        world
          .commands()
          .createPurchaseIntent(
            { planId: granted.planId },
            buyer,
            randomUUID(),
          ),
      ),
    ).resolves.toBe('plan_not_purchasable');
    await expect(
      codeOf(
        world.commands().recordCashPayment(
          {
            clientId: buyer.clientId,
            planId: granted.planId,
            branchId: fixtures.branches[0].id,
          },
          await assistant(),
          randomUUID(),
        ),
      ),
    ).resolves.toBe('plan_not_purchasable');
    await expect(
      codeOf(
        createPrismaCatalogAdministration(world.prisma, {
          now: () => now,
        }).setPlanVisibility({ planId: granted.planId, visible: true }, admin),
      ),
    ).resolves.toBe('invalid_catalog_value');
    await expect(
      world.prisma.plan.findUniqueOrThrow({ where: { id: granted.planId } }),
    ).resolves.toMatchObject({ hiddenAt: expect.any(Date) as Date });
  });

  it('never counts as income', async () => {
    const admin = await administrator();
    const oversight = createPrismaOversight(world.prisma, { now: () => now });
    const window = {
      from: new Date(now.getTime() - 60 * 60 * 1_000),
      until: new Date(now.getTime() + 60 * 60 * 1_000),
    };
    const before = await oversight.incomeReport(window, admin);
    const tester = await world.newClient('Tester Seis');

    await access().grant(
      { clientId: tester.clientId, endsOn },
      admin,
      randomUUID(),
    );

    const after = await oversight.incomeReport(window, admin);
    expect(after.totalCentavos).toBe(before.totalCentavos);
    expect(after.byMethod).toEqual(before.byMethod);
  });
});
