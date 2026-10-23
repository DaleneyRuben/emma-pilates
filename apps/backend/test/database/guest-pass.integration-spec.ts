import { randomUUID } from 'node:crypto';
import { PrismaClient } from '../../src/generated/prisma/client';
import { PrismaBookingCommands } from '../../src/booking/commands/prisma-booking-commands';
import { openGuestPass } from '../../src/booking/payments/open-guest-pass';
import {
  createClientWithSubscription,
  createFixture,
} from './booking-command-test-support';
import { createPrismaAdapter } from '../../src/database/prisma-adapter';
import { createPrismaPaymentCommands } from '../../src/booking/payments/prisma-payment-commands';
import { applyDevelopmentFixtures } from '../../src/development-fixtures/apply-development-fixtures';
import { buildDevelopmentFixtures } from '../../src/development-fixtures/development-fixtures';
import {
  DatabaseTestContext,
  startDatabaseTestContext,
} from './database-test-context';

const today = new Date('2026-09-21T00:00:00.000Z');
const now = new Date('2026-09-21T15:00:00.000Z');

// BKM-014, decisions §5.3: the host's +1 lands once, when the friend's first
// real Payment is approved, on her current Subscription or owed to her next.
describe('guest pass reward', () => {
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

  const administrator = async () => {
    const account = await prisma.account.findFirstOrThrow({
      where: { email: 'emma.vargas@example.com', deletedAt: null },
      select: { id: true, staffMemberId: true },
    });
    const branch = await prisma.branch.findFirstOrThrow({
      select: { id: true },
    });
    return { account, branchId: branch.id };
  };

  const pay = async (clientId: string) => {
    const staff = await administrator();
    const plan = await prisma.plan.findFirstOrThrow({
      where: { name: 'Paquete de 8 clases' },
      select: { id: true },
    });
    return createPrismaPaymentCommands(prisma, {
      now: () => now,
      // PAY-005 removes the Bs 60 award. Until #157 merges the confirmation
      // still writes it, and the check requires it to be positive.
      referralRewardCentavos: 6000,
    }).recordCashPayment(
      { clientId, planId: plan.id, branchId: staff.branchId },
      {
        accountId: staff.account.id,
        authenticationSessionId: randomUUID(),
        identity: {
          kind: 'staff',
          staffMemberId: staff.account.staffMemberId!,
          role: 'administrator',
          branchIds: [],
        },
      },
      randomUUID(),
    );
  };

  const rewards = (clientId: string) =>
    prisma.allowanceAdjustment.count({
      where: { clientId, reason: 'INVITE_CONVERTED', deletedAt: null },
    });

  it('refuses a second invitation by the same host in the same calendar month', async () => {
    const host = await prisma.client.create({
      data: { name: 'Anfitriona', referralCode: `REF-${randomUUID()}` },
    });
    const author = await prisma.account.findFirstOrThrow({
      where: { email: 'emma.vargas@example.com', deletedAt: null },
      select: { id: true },
    });
    const friend = async () => {
      const created = await prisma.client.create({
        data: { name: 'Amiga', referralCode: `REF-${randomUUID()}` },
      });
      return created.id;
    };
    const invite = (friendClientId: string) =>
      prisma.$transaction((transaction) =>
        openGuestPass(transaction, {
          hostClientId: host.id,
          friendClientId,
          authorAccountId: author.id,
          now,
        }),
      );

    await invite(await friend());
    await expect(invite(await friend())).rejects.toThrow(
      'guest_pass_monthly_limit',
    );
  });

  it('allows an invitation in the next calendar month', async () => {
    const host = await prisma.client.create({
      data: { name: 'Anfitriona', referralCode: `REF-${randomUUID()}` },
    });
    const author = await prisma.account.findFirstOrThrow({
      where: { email: 'emma.vargas@example.com', deletedAt: null },
      select: { id: true },
    });
    const friend = async () =>
      (
        await prisma.client.create({
          data: { name: 'Amiga', referralCode: `REF-${randomUUID()}` },
        })
      ).id;
    const invite = (friendClientId: string, at: Date) =>
      prisma.$transaction((transaction) =>
        openGuestPass(transaction, {
          hostClientId: host.id,
          friendClientId,
          authorAccountId: author.id,
          now: at,
        }),
      );

    await invite(await friend(), now);
    const second = await invite(
      await friend(),
      new Date('2026-10-21T15:00:00.000Z'),
    );
    expect(second.id).toEqual(expect.any(String));
  });

  it('refuses the last place in a Session for a guest pass and lets a paying Client take it', async () => {
    const fixture = await createFixture(prisma, { capacity: 2, now });
    await prisma.booking.create({
      data: {
        sessionId: fixture.sessionId,
        clientId: fixture.clientId,
        subscriptionId: fixture.subscriptionId,
        createdByAccountId: fixture.accountId,
      },
    });
    const host = await prisma.client.create({
      data: { name: 'Anfitriona', referralCode: `REF-${randomUUID()}` },
    });
    const friend = await prisma.client.create({
      data: { name: 'Invitada', referralCode: `REF-${randomUUID()}` },
    });
    const friendAccount = await prisma.account.create({
      data: { email: `${randomUUID()}@example.com`, clientId: friend.id },
    });
    await prisma.$transaction((transaction) =>
      openGuestPass(transaction, {
        hostClientId: host.id,
        friendClientId: friend.id,
        authorAccountId: fixture.accountId,
        now,
      }),
    );
    const commands = new PrismaBookingCommands(prisma, () => now);

    await expect(
      commands.create(
        { sessionId: fixture.sessionId },
        {
          accountId: friendAccount.id,
          authenticationSessionId: randomUUID(),
          identity: { kind: 'client', clientId: friend.id },
        },
      ),
    ).rejects.toThrow('guest_pass_last_place');

    const paying = await createClientWithSubscription(prisma);
    const taken = await commands.create(
      { sessionId: fixture.sessionId },
      {
        accountId: paying.accountId,
        authenticationSessionId: randomUUID(),
        identity: { kind: 'client', clientId: paying.clientId },
      },
    );
    expect(taken.id).toEqual(expect.any(String));
  });

  it('refuses a second guest pass class for the same friend', async () => {
    const fixture = await createFixture(prisma, { capacity: 8, now });
    const host = await prisma.client.create({
      data: { name: 'Anfitriona', referralCode: `REF-${randomUUID()}` },
    });
    const friend = await prisma.client.create({
      data: { name: 'Invitada', referralCode: `REF-${randomUUID()}` },
    });
    const friendAccount = await prisma.account.create({
      data: { email: `${randomUUID()}@example.com`, clientId: friend.id },
    });
    await prisma.$transaction((transaction) =>
      openGuestPass(transaction, {
        hostClientId: host.id,
        friendClientId: friend.id,
        authorAccountId: fixture.accountId,
        now,
      }),
    );
    const commands = new PrismaBookingCommands(prisma, () => now);
    const principal = {
      accountId: friendAccount.id,
      authenticationSessionId: randomUUID(),
      identity: { kind: 'client' as const, clientId: friend.id },
    };
    const later = new Date(now.getTime() + 26 * 60 * 60 * 1_000);
    const second = await prisma.session.create({
      data: {
        branchId: fixture.branchId,
        classTypeId: (
          await prisma.session.findUniqueOrThrow({
            where: { id: fixture.sessionId },
            select: { classTypeId: true },
          })
        ).classTypeId,
        trainerStaffMemberId: fixture.trainerId,
        startsAt: later,
        endsAt: new Date(later.getTime() + 60 * 60 * 1_000),
        capacity: 8,
      },
      select: { id: true },
    });

    await commands.create({ sessionId: fixture.sessionId }, principal);
    await expect(
      commands.create({ sessionId: second.id }, principal),
    ).rejects.toThrow('guest_pass_already_used');
  });

  it("applies the host's reward once, on her current Subscription", async () => {
    const lucia = await prisma.client.findFirstOrThrow({
      where: { name: 'Lucía Fernández', deletedAt: null },
      select: { id: true },
    });
    const mariana = await prisma.account.findFirstOrThrow({
      where: { email: 'mariana@example.com', deletedAt: null },
      select: { id: true, clientId: true },
    });
    await prisma.$transaction((transaction) =>
      openGuestPass(transaction, {
        hostClientId: lucia.id,
        friendClientId: mariana.clientId!,
        authorAccountId: mariana.id,
        now,
      }),
    );

    // The courtesy pass is still in use; end it so her first real Payment
    // can be confirmed.
    await prisma.subscription.updateMany({
      where: { clientId: mariana.clientId!, state: 'ACTIVE' },
      data: { state: 'EXPIRED', expiredAt: now },
    });
    await pay(mariana.clientId!);

    await expect(rewards(lucia.id)).resolves.toBe(1);
    await prisma.subscription.updateMany({
      where: { clientId: mariana.clientId!, state: 'ACTIVE' },
      data: { state: 'EXPIRED', expiredAt: now },
    });
    await pay(mariana.clientId!);
    await expect(rewards(lucia.id)).resolves.toBe(1);
  });

  it("owes the reward to the host's next Subscription when she has none", async () => {
    const host = await prisma.client.findFirstOrThrow({
      where: { name: 'Sofía Guzmán', deletedAt: null },
      select: { id: true },
    });
    const friend = await prisma.client.create({
      data: { name: 'Amiga sin plan', referralCode: `REF-${randomUUID()}` },
    });
    const author = await prisma.account.findFirstOrThrow({
      where: { email: 'emma.vargas@example.com', deletedAt: null },
      select: { id: true },
    });
    await prisma.$transaction((transaction) =>
      openGuestPass(transaction, {
        hostClientId: host.id,
        friendClientId: friend.id,
        authorAccountId: author.id,
        now,
      }),
    );
    await prisma.subscription.updateMany({
      where: { clientId: friend.id, state: 'ACTIVE' },
      data: { state: 'EXPIRED', expiredAt: now },
    });

    await pay(friend.id);

    await expect(rewards(host.id)).resolves.toBe(0);
    const pass = await prisma.guestPass.findFirstOrThrow({
      where: { friendClientId: friend.id, deletedAt: null },
      select: { rewardOwed: true },
    });
    expect(pass.rewardOwed).toBe(true);

    await prisma.subscription.updateMany({
      where: { clientId: host.id, state: 'ACTIVE' },
      data: { state: 'EXPIRED', expiredAt: now },
    });
    await pay(host.id);
    await expect(rewards(host.id)).resolves.toBe(1);
  });

  it('never counts the guest pass as a first Plan', async () => {
    const host = await prisma.client.create({
      data: { name: 'Anfitriona', referralCode: `REF-${randomUUID()}` },
    });
    const friend = await prisma.client.create({
      data: { name: 'Invitada nueva', referralCode: `REF-${randomUUID()}` },
    });
    const author = await prisma.account.findFirstOrThrow({
      where: { email: 'emma.vargas@example.com', deletedAt: null },
      select: { id: true },
    });
    await prisma.$transaction((transaction) =>
      openGuestPass(transaction, {
        hostClientId: host.id,
        friendClientId: friend.id,
        authorAccountId: author.id,
        now,
      }),
    );

    await expect(
      prisma.allowanceAdjustment.count({
        where: {
          clientId: friend.id,
          reason: 'GIFT_NEW_CLIENT',
          deletedAt: null,
        },
      }),
    ).resolves.toBe(0);
    await prisma.subscription.updateMany({
      where: { clientId: friend.id, state: 'ACTIVE' },
      data: { state: 'EXPIRED', expiredAt: now },
    });
    await pay(friend.id);
    await expect(
      prisma.allowanceAdjustment.count({
        where: {
          clientId: friend.id,
          reason: 'GIFT_NEW_CLIENT',
          deletedAt: null,
        },
      }),
    ).resolves.toBe(1);
  });
});
