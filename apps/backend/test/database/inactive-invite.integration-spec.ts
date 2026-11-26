import { randomUUID } from 'node:crypto';
import { PrismaClient } from '../../src/generated/prisma/client';
import { readInactiveInvite } from '../../src/booking/client/prisma-inactive-invite';
import { createPrismaAdapter } from '../../src/database/prisma-adapter';
import { applyDevelopmentFixtures } from '../../src/development-fixtures/apply-development-fixtures';
import { buildDevelopmentFixtures } from '../../src/development-fixtures/development-fixtures';
import { openGuestPass } from '../../src/booking/payments/open-guest-pass';
import {
  DatabaseTestContext,
  startDatabaseTestContext,
} from './database-test-context';
import { giveHostPlan } from './host-plan-test-support';

const now = new Date(Date.now() + 60_000);
const today = new Date(
  Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
);

// Walkthrough n.º 22 (C02j): a friend who registered with the code of a
// host without a paid Plan got no pass; her Inicio says why.
describe('the inactive invite on a friend’s Inicio', () => {
  let context: DatabaseTestContext;
  let prisma: PrismaClient;

  beforeAll(async () => {
    context = await startDatabaseTestContext();
    prisma = new PrismaClient({
      adapter: createPrismaAdapter(context.databaseUrl),
    });
    await applyDevelopmentFixtures(prisma, {
      fixtures: buildDevelopmentFixtures({ today }),
      passwordHash: 'not-a-real-hash',
    });
  });

  afterAll(async () => {
    await prisma?.$disconnect();
    await context?.stop();
  });

  const referral = async () => {
    const host = await prisma.client.create({
      data: { name: 'Lucía Fernández', referralCode: `L-${randomUUID()}` },
      select: { id: true, referralCode: true },
    });
    const friend = await prisma.client.create({
      data: { name: 'Sofía Amiga', referralCode: `S-${randomUUID()}` },
      select: { id: true },
    });
    await prisma.clientAcquisition.create({
      data: {
        clientId: friend.id,
        declaredChannel: 'FRIEND',
        channel: 'FRIEND',
        referralCode: host.referralCode,
        referrerClientId: host.id,
      },
    });
    return { hostId: host.id, friendId: friend.id };
  };

  it('names the host whose code was not active', async () => {
    const { friendId } = await referral();

    await expect(readInactiveInvite(prisma, friendId, now)).resolves.toEqual({
      hostFirstName: 'Lucía',
    });
  });

  it('says nothing when the friend did get her pass', async () => {
    const { hostId, friendId } = await referral();
    const author = await prisma.account.findFirstOrThrow({
      where: { email: 'emma.vargas@example.com', deletedAt: null },
      select: { id: true },
    });
    await prisma.$transaction((transaction) =>
      openGuestPass(transaction, {
        hostClientId: hostId,
        friendClientId: friendId,
        authorAccountId: author.id,
        now,
      }),
    );

    await expect(readInactiveInvite(prisma, friendId, now)).resolves.toBeNull();
  });

  it('says nothing once the host pays, nor without a friend’s code', async () => {
    const { hostId, friendId } = await referral();
    await giveHostPlan(prisma, { clientId: hostId, now });
    const alone = await prisma.client.create({
      data: { name: 'Sin código', referralCode: `N-${randomUUID()}` },
      select: { id: true },
    });

    await expect(readInactiveInvite(prisma, friendId, now)).resolves.toBeNull();
    await expect(readInactiveInvite(prisma, alone.id, now)).resolves.toBeNull();
  });
});
