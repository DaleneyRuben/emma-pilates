import { randomUUID } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../src/generated/prisma/client';
import { createPrismaCampaignGrant } from '../../src/booking/payments/prisma-campaign-grant';
import { createFixture } from './booking-command-test-support';
import {
  DatabaseTestContext,
  startDatabaseTestContext,
} from './database-test-context';

const today = new Date('2026-10-23T15:00:00.000Z');

const administrator = (accountId: string) => ({
  accountId,
  authenticationSessionId: randomUUID(),
  identity: {
    kind: 'staff' as const,
    staffMemberId: randomUUID(),
    role: 'administrator' as const,
    branchIds: [],
  },
});

describe('campaign extra classes', () => {
  let context: DatabaseTestContext;
  let prisma: PrismaClient;

  beforeAll(async () => {
    context = await startDatabaseTestContext();
    prisma = new PrismaClient({ adapter: new PrismaPg(context.pool) });
  });

  afterAll(async () => {
    await prisma?.$disconnect();
    await context?.stop();
  });

  it('grants one campaign class to every live Subscription, skips a Client without one, and a retry writes nothing more', async () => {
    const live = await createFixture(prisma, { now: today });
    await prisma.subscription.update({
      where: { id: live.subscriptionId },
      data: {
        startsOn: new Date('2026-10-01'),
        endsOn: new Date('2026-10-31'),
      },
    });
    await prisma.client.update({
      where: { id: live.clientId },
      data: { name: 'Lucía' },
    });
    const waiting = await prisma.client.create({
      data: { name: 'Sofía', referralCode: randomUUID() },
    });
    await prisma.account.create({
      data: { email: `${randomUUID()}@example.com`, clientId: waiting.id },
    });
    const paymentsBefore = await prisma.payment.findMany({
      select: { id: true, amountDueCentavos: true, planPriceCentavos: true },
    });
    const grant = createPrismaCampaignGrant(prisma, () => today);
    const command = {
      name: 'Inicio de año',
      classes: 1,
      idempotencyKey: randomUUID(),
    };

    const first = await grant.grant(command, administrator(live.accountId));
    const retry = await grant.grant(command, administrator(live.accountId));

    expect(first).toEqual(retry);
    expect(first.granted).toEqual([{ clientId: live.clientId, name: 'Lucía' }]);
    expect(first.skipped).toEqual([{ clientId: waiting.id, name: 'Sofía' }]);
    await expect(prisma.allowanceAdjustment.count()).resolves.toBe(1);
    await expect(
      prisma.allowanceAdjustment.findFirstOrThrow({
        select: { classes: true, reason: true, clientId: true },
      }),
    ).resolves.toEqual({
      classes: 1,
      reason: 'CAMPAIGN',
      clientId: live.clientId,
    });
    await expect(
      prisma.auditRecord.findFirstOrThrow({
        where: { actionCode: 'allowance_adjustment.recorded' },
        select: { metadata: true },
      }),
    ).resolves.toEqual({
      metadata: expect.objectContaining({
        reason: 'campaign',
        campaignName: 'Inicio de año',
        classes: 1,
      }) as unknown,
    });
    await expect(
      prisma.payment.findMany({
        select: { id: true, amountDueCentavos: true, planPriceCentavos: true },
      }),
    ).resolves.toEqual(paymentsBefore);
  });
});
