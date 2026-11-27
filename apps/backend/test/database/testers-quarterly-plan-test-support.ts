import { randomUUID } from 'node:crypto';
import { recordAllowanceAdjustment } from '../../src/booking/payments/allowance-adjustments';
import { createPrismaCourtesyAccess } from '../../src/booking/payments/prisma-courtesy-access';
import { testersQuarterlyPlan } from '../../src/script-runner/scripts/20261127-testers-quarterly-plan';
import { now, type PaymentWorld } from './payment-lifecycle-test-support';

export type Logged = { event: string; fields: Record<string, unknown> };

export const courtesyEndsOn = new Date('2026-12-31T00:00:00.000Z');
export const grantedAt = new Date('2026-09-10T15:00:00.000Z');
export const yesterday = new Date('2026-09-20T00:00:00.000Z');
export const branch = 'Centro';

export const clientLines = (logged: Logged[]) =>
  logged.filter((line) => line.event === 'testers_quarterly_plan_client');

export const lineOf = (logged: Logged[], name: string) =>
  clientLines(logged).find((line) => line.fields.name === name)?.fields;

// The script and the closed-test testers it moves, on the payment world.
export const testersHarness = (world: () => PaymentWorld) => {
  const administrator = () =>
    world().staffPrincipal('paola.mendoza@example.com');

  const run = async (
    params: Record<string, unknown>,
    dryRun = false,
  ): Promise<Logged[]> => {
    const logged: Logged[] = [];
    await testersQuarterlyPlan.run({
      prisma: world().prisma,
      params,
      dryRun,
      now: () => now,
      log: (event, fields = {}) => logged.push({ event, fields }),
    });
    return logged;
  };

  // A closed-test tester: Courtesy Access since 10 Sep and the extras an
  // Administrator added on the admin web.
  const tester = async (name: string, extras = 40) => {
    const { prisma } = world();
    const client = await world().newClient(name);
    const admin = await administrator();
    const payment = await createPrismaCourtesyAccess(prisma, {
      now: () => grantedAt,
    }).grant(
      { clientId: client.clientId, endsOn: courtesyEndsOn },
      admin,
      randomUUID(),
    );
    const courtesySubscriptionId = payment.subscriptionId!;
    if (extras > 0) {
      await prisma.$transaction((transaction) =>
        recordAllowanceAdjustment(transaction, {
          subscriptionId: courtesySubscriptionId,
          clientId: client.clientId,
          classes: extras,
          reason: 'courtesy',
          author: { accountId: admin.accountId, role: 'ADMINISTRATOR' },
          now: grantedAt,
          correlationId: courtesySubscriptionId,
        }),
      );
    }
    return { ...client, courtesySubscriptionId };
  };

  const liveExtras = (subscriptionId: string) =>
    world().prisma.allowanceAdjustment.findMany({
      where: { subscriptionId, deletedAt: null },
      orderBy: { createdAt: 'asc' },
      select: { classes: true, reason: true },
    });

  const quarterlyPayment = (clientId: string) =>
    world().prisma.payment.findFirst({
      where: { clientId, planNameSnapshot: 'Trimestral 36 clases' },
      include: { subscription: true },
    });

  const courtesySubscription = (id: string) =>
    world().prisma.subscription.findUniqueOrThrow({ where: { id } });

  return {
    administrator,
    run,
    tester,
    liveExtras,
    quarterlyPayment,
    courtesySubscription,
  };
};
