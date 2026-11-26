import { randomUUID } from 'node:crypto';
import { PrismaClient } from '../../src/generated/prisma/client';
import { createPrismaAdapter } from '../../src/database/prisma-adapter';
import { openGuestPassForVerifiedClient } from '../../src/booking/payments/open-verified-guest-pass';
import { createPrismaPaymentCommands } from '../../src/booking/payments/prisma-payment-commands';
import { applyDevelopmentFixtures } from '../../src/development-fixtures/apply-development-fixtures';
import { buildDevelopmentFixtures } from '../../src/development-fixtures/development-fixtures';
import type { AuthenticatedPrincipal } from '../../src/system-identity/authentication/resolve-authenticated-principal';
import {
  DatabaseTestContext,
  startDatabaseTestContext,
} from './database-test-context';
import { giveHostPlan } from './host-plan-test-support';

const now = new Date(Date.now() + 60_000);
const today = new Date(
  Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
);

// Walkthrough n.º 22, owner's decision of 26 Nov: a referral opens a Guest
// Pass only when the host has a paid Plan in force when the friend verifies
// her email. A Courtesy Access or her own Guest Pass does not count. Without
// one the friend's Account is created all the same, with no pass.
describe('a Guest Pass needs a host with a paid Plan in force', () => {
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
      data: { name: 'Lucía Anfitriona', referralCode: `L-${randomUUID()}` },
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

  const verified = async (friendId: string) => {
    const author = await prisma.account.findFirstOrThrow({
      where: { email: 'emma.vargas@example.com', deletedAt: null },
      select: { id: true },
    });
    await prisma.$transaction((transaction) =>
      openGuestPassForVerifiedClient(transaction, {
        friendClientId: friendId,
        authorAccountId: author.id,
        now,
      }),
    );
    return prisma.guestPass.count({
      where: { friendClientId: friendId, deletedAt: null },
    });
  };

  it('opens no pass when the host has never bought a Plan', async () => {
    const { friendId } = await referral();

    await expect(verified(friendId)).resolves.toBe(0);
  });

  it('opens no pass when the host only has a Courtesy Access', async () => {
    const { hostId, friendId } = await referral();
    await giveHostPlan(prisma, { clientId: hostId, now, method: 'COURTESY' });

    await expect(verified(friendId)).resolves.toBe(0);
  });

  it('opens no pass when the host’s paid Plan has already ended', async () => {
    const { hostId, friendId } = await referral();
    await giveHostPlan(prisma, { clientId: hostId, now, endsInDays: -1 });

    await expect(verified(friendId)).resolves.toBe(0);
  });

  it('opens no pass when the host’s paid Plan was voided', async () => {
    const { hostId, friendId } = await referral();
    await giveHostPlan(prisma, { clientId: hostId, now, voided: true });

    await expect(verified(friendId)).resolves.toBe(0);
  });

  it('opens no pass when the host’s paid Plan starts later', async () => {
    const { hostId, friendId } = await referral();
    await giveHostPlan(prisma, { clientId: hostId, now, startsInDays: 3 });

    await expect(verified(friendId)).resolves.toBe(0);
  });

  it('opens the pass when the host has a paid Plan in force', async () => {
    const { hostId, friendId } = await referral();
    await giveHostPlan(prisma, { clientId: hostId, now, method: 'CASH' });

    await expect(verified(friendId)).resolves.toBe(1);
  });

  it('tells the host whether her code is active', async () => {
    const principal = async (
      clientId: string,
    ): Promise<AuthenticatedPrincipal> => {
      const account = await prisma.account.create({
        data: { email: `${randomUUID()}@example.com`, clientId },
        select: { id: true },
      });
      return {
        accountId: account.id,
        authenticationSessionId: randomUUID(),
        identity: { kind: 'client', clientId },
      };
    };
    const commands = createPrismaPaymentCommands(prisma, { now: () => now });
    const paying = await referral();
    await giveHostPlan(prisma, { clientId: paying.hostId, now });
    const unpaid = await referral();
    await giveHostPlan(prisma, {
      clientId: unpaid.hostId,
      now,
      method: 'COURTESY',
    });

    await expect(
      commands.readReferrals(await principal(paying.hostId)),
    ).resolves.toEqual(expect.objectContaining({ codeActive: true }));
    await expect(
      commands.readReferrals(await principal(unpaid.hostId)),
    ).resolves.toEqual(expect.objectContaining({ codeActive: false }));
  });
});
