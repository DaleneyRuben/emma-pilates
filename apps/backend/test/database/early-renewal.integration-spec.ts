import { randomUUID } from 'node:crypto';
import { PrismaClient } from '../../src/generated/prisma/client';
import { PaymentRuleError } from '../../src/booking/payments/payment-errors';
import {
  fixtures,
  now,
  PaymentWorld,
  plan,
  startPaymentWorld,
  today,
} from './payment-lifecycle-test-support';

describe('early renewal', () => {
  let world: PaymentWorld;
  let prisma: PrismaClient;
  let commands: PaymentWorld['commands'];
  let staffPrincipal: PaymentWorld['staffPrincipal'];
  let newClient: PaymentWorld['newClient'];

  beforeAll(async () => {
    world = await startPaymentWorld();
    ({ prisma, commands, staffPrincipal, newClient } = world);
  });

  afterAll(async () => {
    await world?.stop();
  });

  it('ends a spent Subscription the day before a renewal that starts today', async () => {
    const buyer = await newClient('Sin clases');
    const assistant = await staffPrincipal('camila.rojas@example.com');
    const centro = fixtures.branches.find((b) => b.name === 'Centro')!;
    const current = await prisma.subscription.create({
      data: {
        clientId: buyer.clientId,
        planId: plan.id,
        planNameSnapshot: plan.name,
        durationDaysSnapshot: plan.durationDays,
        originalClassAllowance: plan.classAllowance,
        remainingClassAllowance: 0,
        startsOn: new Date('2026-09-11T00:00:00.000Z'),
        endsOn: new Date('2026-10-01T00:00:00.000Z'),
        activatedAt: now,
      },
      select: { id: true },
    });

    const renewal = await commands().recordCashPayment(
      {
        clientId: buyer.clientId,
        planId: plan.id,
        branchId: centro.id,
        startsOn: '2026-09-21',
      },
      assistant,
      randomUUID(),
    );

    expect(renewal.startsOn).toBe('2026-09-21');
    await expect(
      prisma.subscription.findUniqueOrThrow({ where: { id: current.id } }),
    ).resolves.toMatchObject({
      state: 'ACTIVE',
      endsOn: new Date('2026-09-20T00:00:00.000Z'),
    });
    await expect(
      prisma.auditRecord.findFirst({
        where: {
          actionCode: 'subscription.ended_early',
          targetId: current.id,
        },
      }),
    ).resolves.toMatchObject({ correlationId: renewal.id });
  });

  it('lets exactly one of two simultaneous cash renewals win', async () => {
    const buyer = await newClient('Carrera');
    const assistant = await staffPrincipal('camila.rojas@example.com');
    const centro = fixtures.branches.find((b) => b.name === 'Centro')!;
    await prisma.subscription.create({
      data: {
        clientId: buyer.clientId,
        planId: plan.id,
        planNameSnapshot: plan.name,
        durationDaysSnapshot: plan.durationDays,
        originalClassAllowance: plan.classAllowance,
        remainingClassAllowance: 2,
        startsOn: new Date('2026-09-01T00:00:00.000Z'),
        endsOn: new Date('2026-09-24T00:00:00.000Z'),
        activatedAt: now,
      },
    });

    const results = await Promise.allSettled([
      commands().recordCashPayment(
        { clientId: buyer.clientId, planId: plan.id, branchId: centro.id },
        assistant,
        randomUUID(),
      ),
      commands().recordCashPayment(
        { clientId: buyer.clientId, planId: plan.id, branchId: centro.id },
        assistant,
        randomUUID(),
      ),
    ]);

    const fulfilled = results.filter((result) => result.status === 'fulfilled');
    const rejected = results.filter(
      (result): result is PromiseRejectedResult => result.status === 'rejected',
    );
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(rejected[0].reason).toBeInstanceOf(PaymentRuleError);
    expect((rejected[0].reason as PaymentRuleError).code).toBe(
      'future_subscription_exists',
    );
    await expect(
      prisma.subscription.count({
        where: { clientId: buyer.clientId, startsOn: { gt: today } },
      }),
    ).resolves.toBe(1);
  });
});
