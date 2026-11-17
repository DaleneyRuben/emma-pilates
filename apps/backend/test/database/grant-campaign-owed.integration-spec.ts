import { randomUUID } from 'node:crypto';
import { PrismaClient } from '../../src/generated/prisma/client';
import { createPrismaCampaignGrant } from '../../src/booking/payments/prisma-campaign-grant';
import {
  fixtures,
  now,
  PaymentWorld,
  plan,
  startPaymentWorld,
} from './payment-lifecycle-test-support';

// FIX-064 (walkthrough finding 90): a Client without a current Plan is owed
// the campaign's classes, and her next Plan collects them.
describe('owed campaign classes', () => {
  let world: PaymentWorld;
  let prisma: PrismaClient;

  beforeAll(async () => {
    world = await startPaymentWorld();
    ({ prisma } = world);
  });

  afterAll(async () => {
    await world?.stop();
  });

  const cash = async (clientId: string) => {
    const assistant = await world.staffPrincipal('camila.rojas@example.com');
    const centro = fixtures.branches.find(
      (branch) => branch.name === 'Centro',
    )!;
    return world
      .commands()
      .recordCashPayment(
        { clientId, planId: plan.id, branchId: centro.id },
        assistant,
        randomUUID(),
      );
  };

  const campaignAdjustments = (clientId: string) =>
    prisma.allowanceAdjustment.findMany({
      where: { clientId, reason: 'CAMPAIGN', deletedAt: null },
      select: { subscriptionId: true, classes: true },
    });

  it('owes the classes to a Client without a Plan and her next Plan collects them once', async () => {
    const waiting = await world.newClient('Sin plan');
    const closed = await world.newClient('Cuenta cerrada');
    await prisma.account.updateMany({
      where: { clientId: closed.clientId },
      data: { deletedAt: now },
    });
    await prisma.client.update({
      where: { id: closed.clientId },
      data: { deletedAt: now },
    });
    const administrator = await world.staffPrincipal(
      'paola.mendoza@example.com',
    );
    const grant = createPrismaCampaignGrant(prisma, () => now);
    const command = {
      name: 'Vacaciones',
      classes: 2,
      idempotencyKey: randomUUID(),
    };

    const preview = await grant.preview(administrator);
    const first = await grant.grant(command, administrator);
    const retry = await grant.grant(command, administrator);

    expect(retry).toEqual(first);
    expect(first.skipped).toEqual([]);
    expect(first.owed).toContainEqual({
      clientId: waiting.clientId,
      name: 'Sin plan',
    });
    expect(preview.owed).toContainEqual({
      clientId: waiting.clientId,
      name: 'Sin plan',
    });
    expect(preview.recipientCount).toBe(
      first.granted.length + first.owed.length,
    );
    const reached = [...first.granted, ...first.owed].map(
      (client) => client.clientId,
    );
    expect(reached).not.toContain(closed.clientId);
    await expect(campaignAdjustments(waiting.clientId)).resolves.toEqual([]);

    await cash(waiting.clientId);
    const subscription = await prisma.subscription.findFirstOrThrow({
      where: { clientId: waiting.clientId },
      select: { id: true },
    });
    await expect(campaignAdjustments(waiting.clientId)).resolves.toEqual([
      { subscriptionId: subscription.id, classes: 2 },
    ]);
    await expect(
      prisma.auditRecord.findFirstOrThrow({
        where: {
          actionCode: 'allowance_adjustment.recorded',
          metadata: { path: ['clientId'], equals: waiting.clientId },
        },
        select: { metadata: true },
      }),
    ).resolves.toEqual({
      metadata: expect.objectContaining({
        reason: 'campaign',
        campaignName: 'Vacaciones',
        classes: 2,
      }) as unknown,
    });

    await cash(waiting.clientId);
    await expect(campaignAdjustments(waiting.clientId)).resolves.toHaveLength(
      1,
    );
  });
});
