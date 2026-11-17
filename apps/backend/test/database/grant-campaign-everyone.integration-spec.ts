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

// FIX-064 (walkthrough finding 90): «TODAS las clientas no matter what».
describe('a campaign reaches every active Client', () => {
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

  const currentClient = async (name: string) => {
    const fixture = await createFixture(prisma, { now: today });
    await prisma.subscription.update({
      where: { id: fixture.subscriptionId },
      data: {
        startsOn: new Date('2026-10-01'),
        endsOn: new Date('2026-10-30'),
      },
    });
    await prisma.client.update({
      where: { id: fixture.clientId },
      data: { name },
    });
    return fixture;
  };

  it('adds the classes to a founder and to a Plan without a paid sale, never to a Guest Pass', async () => {
    const founder = await currentClient('Lucía');
    await prisma.founderMembership.create({
      data: { clientId: founder.clientId, number: 1, since: today },
    });
    const friend = await currentClient('Valeria');
    await prisma.guestPass.create({
      data: {
        hostClientId: founder.clientId,
        friendClientId: friend.clientId,
        courtesySubscriptionId: friend.subscriptionId,
      },
    });
    const grant = createPrismaCampaignGrant(prisma, () => today);

    const result = await grant.grant(
      { name: 'Inicio de año', classes: 2, idempotencyKey: randomUUID() },
      administrator(founder.accountId),
    );

    expect(result.granted).toEqual([
      { clientId: founder.clientId, name: 'Lucía' },
    ]);
    await expect(
      prisma.allowanceAdjustment.findMany({
        select: { subscriptionId: true, classes: true, reason: true },
      }),
    ).resolves.toEqual([
      {
        subscriptionId: founder.subscriptionId,
        classes: 2,
        reason: 'CAMPAIGN',
      },
    ]);
  });
});
