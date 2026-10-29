import { randomUUID } from 'node:crypto';
import { PrismaClient } from '../../src/generated/prisma/client';
import { PrismaBookingCommands } from '../../src/booking/commands/prisma-booking-commands';
import { openGuestPass } from '../../src/booking/payments/open-guest-pass';
import { createFixture } from './booking-command-test-support';
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

// Decision 2 and the invite-reward landing: a timely cancellation restores
// the pass, and the host's +1 never lands on her own guest pass.
describe('guest pass rebook and reward landing', () => {
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

  const pay = async (clientId: string) => {
    const account = await prisma.account.findFirstOrThrow({
      where: { email: 'emma.vargas@example.com', deletedAt: null },
      select: { id: true, staffMemberId: true },
    });
    const branch = await prisma.branch.findFirstOrThrow({
      select: { id: true },
    });
    const plan = await prisma.plan.findFirstOrThrow({
      where: { name: 'Paquete de 8 clases' },
      select: { id: true },
    });
    return createPrismaPaymentCommands(prisma, {
      now: () => now,
    }).recordCashPayment(
      { clientId, planId: plan.id, branchId: branch.id },
      {
        accountId: account.id,
        authenticationSessionId: randomUUID(),
        identity: {
          kind: 'staff',
          staffMemberId: account.staffMemberId!,
          role: 'administrator',
          branchIds: [],
        },
      },
      randomUUID(),
    );
  };

  it('restores a guest pass when she cancels in time, and still refuses the last place', async () => {
    const fixture = await createFixture(prisma, { capacity: 8, now });
    const host = await prisma.client.create({
      data: { name: 'Anfitriona', referralCode: `REF-${randomUUID()}` },
    });
    const friend = await prisma.client.create({
      data: {
        name: 'Invitada que cancela',
        referralCode: `REF-${randomUUID()}`,
      },
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
    const booked = await commands.create(
      { sessionId: fixture.sessionId },
      principal,
    );

    await commands.cancel({ bookingId: booked.id }, principal);

    const pass = await prisma.guestPass.findFirstOrThrow({
      where: { friendClientId: friend.id, deletedAt: null },
      select: { bookingId: true },
    });
    expect(pass.bookingId).toBeNull();

    const source = await prisma.session.findUniqueOrThrow({
      where: { id: fixture.sessionId },
      select: { classTypeId: true },
    });
    const lastPlace = await prisma.session.create({
      data: {
        branchId: fixture.branchId,
        classTypeId: source.classTypeId,
        trainerStaffMemberId: fixture.trainerId,
        startsAt: new Date(now.getTime() + 26 * 60 * 60 * 1_000),
        endsAt: new Date(now.getTime() + 27 * 60 * 60 * 1_000),
        capacity: 1,
      },
      select: { id: true },
    });
    await expect(
      commands.create({ sessionId: lastPlace.id }, principal),
    ).rejects.toThrow('guest_pass_last_place');

    const open = await prisma.session.create({
      data: {
        branchId: fixture.branchId,
        classTypeId: source.classTypeId,
        trainerStaffMemberId: fixture.trainerId,
        startsAt: new Date(now.getTime() + 50 * 60 * 60 * 1_000),
        endsAt: new Date(now.getTime() + 51 * 60 * 60 * 1_000),
        capacity: 8,
      },
      select: { id: true },
    });
    const again = await commands.create({ sessionId: open.id }, principal);
    expect(again.id).toEqual(expect.any(String));
  });

  it('restores the pass rules when the studio cancels her class', async () => {
    const bookedAt = new Date();
    const fixture = await createFixture(prisma, {
      capacity: 8,
      now: new Date(bookedAt.getTime() + 48 * 60 * 60 * 1_000),
    });
    const host = await prisma.client.create({
      data: { name: 'Anfitriona estudio', referralCode: `REF-${randomUUID()}` },
    });
    const friend = await prisma.client.create({
      data: {
        name: 'Invitada de estudio',
        referralCode: `REF-${randomUUID()}`,
      },
    });
    await prisma.$transaction((transaction) =>
      openGuestPass(transaction, {
        hostClientId: host.id,
        friendClientId: friend.id,
        authorAccountId: fixture.accountId,
        now: bookedAt,
      }),
    );
    const friendAccount = await prisma.account.create({
      data: { email: `${randomUUID()}@example.com`, clientId: friend.id },
    });
    const commands = new PrismaBookingCommands(prisma, () => bookedAt);
    const principal = {
      accountId: friendAccount.id,
      authenticationSessionId: randomUUID(),
      identity: { kind: 'client' as const, clientId: friend.id },
    };
    await commands.create({ sessionId: fixture.sessionId }, principal);
    const afterBooking = new PrismaBookingCommands(
      prisma,
      () => new Date(bookedAt.getTime() + 60_000),
    );

    await afterBooking.cancelSession(
      { sessionId: fixture.sessionId, reason: 'La sala se cerró' },
      {
        accountId: fixture.accountId,
        authenticationSessionId: randomUUID(),
        identity: {
          kind: 'staff',
          staffMemberId: fixture.trainerId,
          role: 'administrator',
          branchIds: [fixture.branchId],
        },
      },
    );

    const pass = await prisma.guestPass.findFirstOrThrow({
      where: { friendClientId: friend.id, deletedAt: null },
      select: { bookingId: true },
    });
    expect(pass.bookingId).toBeNull();

    const source = await prisma.session.findUniqueOrThrow({
      where: { id: fixture.sessionId },
      select: { classTypeId: true },
    });
    const lastPlace = await prisma.session.create({
      data: {
        branchId: fixture.branchId,
        classTypeId: source.classTypeId,
        trainerStaffMemberId: fixture.trainerId,
        startsAt: new Date(bookedAt.getTime() + 96 * 60 * 60 * 1_000),
        endsAt: new Date(bookedAt.getTime() + 97 * 60 * 60 * 1_000),
        capacity: 1,
      },
      select: { id: true },
    });
    await expect(
      afterBooking.create({ sessionId: lastPlace.id }, principal),
    ).rejects.toThrow('guest_pass_last_place');
  });

  it("owes the reward when the host's only Subscription is her own guest pass", async () => {
    const host = await prisma.client.create({
      data: {
        name: 'Anfitriona con pase',
        referralCode: `REF-${randomUUID()}`,
      },
    });
    const hostAuthor = await prisma.account.create({
      data: { email: `${randomUUID()}@example.com`, clientId: host.id },
      select: { id: true },
    });
    const someone = await prisma.client.create({
      data: { name: 'Quien invita', referralCode: `REF-${randomUUID()}` },
    });
    await prisma.$transaction((transaction) =>
      openGuestPass(transaction, {
        hostClientId: someone.id,
        friendClientId: host.id,
        authorAccountId: hostAuthor.id,
        now,
      }),
    );
    const friend = await prisma.client.create({
      data: { name: 'Amiga que compra', referralCode: `REF-${randomUUID()}` },
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

    const hostPass = await prisma.guestPass.findFirstOrThrow({
      where: { friendClientId: host.id, deletedAt: null },
      select: { courtesySubscriptionId: true },
    });
    await expect(
      prisma.allowanceAdjustment.count({
        where: {
          subscriptionId: hostPass.courtesySubscriptionId,
          reason: 'INVITE_CONVERTED',
          deletedAt: null,
        },
      }),
    ).resolves.toBe(0);
    await expect(
      prisma.guestPass.findFirstOrThrow({
        where: { friendClientId: friend.id, deletedAt: null },
        select: { rewardOwed: true, rewardSubscriptionId: true },
      }),
    ).resolves.toEqual({ rewardOwed: true, rewardSubscriptionId: null });
  });

  it('keeps an owed reward off the host guest pass when her next plan is that pass', async () => {
    const host = await prisma.client.create({
      data: {
        name: 'Anfitriona que cobra',
        referralCode: `REF-${randomUUID()}`,
      },
    });
    const author = await prisma.account.findFirstOrThrow({
      where: { email: 'emma.vargas@example.com', deletedAt: null },
      select: { id: true },
    });
    const friend = await prisma.client.create({
      data: { name: 'Amiga ya compró', referralCode: `REF-${randomUUID()}` },
    });
    await prisma.$transaction((transaction) =>
      openGuestPass(transaction, {
        hostClientId: host.id,
        friendClientId: friend.id,
        authorAccountId: author.id,
        now,
      }),
    );
    await prisma.guestPass.updateMany({
      where: { friendClientId: friend.id, deletedAt: null },
      data: { rewardOwed: true },
    });

    const inviter = await prisma.client.create({
      data: { name: 'Quien la invita', referralCode: `REF-${randomUUID()}` },
    });
    const opened = await prisma.$transaction((transaction) =>
      openGuestPass(transaction, {
        hostClientId: inviter.id,
        friendClientId: host.id,
        authorAccountId: author.id,
        now,
      }),
    );
    // The pass is not the Subscription the class waits for. Her own cash plan
    // is the next one, and that one collects it.
    await prisma.subscription.updateMany({
      where: { clientId: host.id, state: 'ACTIVE' },
      data: { state: 'EXPIRED', expiredAt: now },
    });
    await pay(host.id);

    const landed = await prisma.guestPass.findFirstOrThrow({
      where: { id: opened.id },
      select: { courtesySubscriptionId: true },
    });
    await expect(
      prisma.allowanceAdjustment.count({
        where: {
          subscriptionId: landed.courtesySubscriptionId,
          reason: 'INVITE_CONVERTED',
          deletedAt: null,
        },
      }),
    ).resolves.toBe(0);
    const collected = await prisma.guestPass.findFirstOrThrow({
      where: { friendClientId: friend.id, deletedAt: null },
      select: { rewardOwed: true, rewardSubscriptionId: true },
    });
    expect(collected.rewardOwed).toBe(false);
    expect(collected.rewardSubscriptionId).not.toBe(
      landed.courtesySubscriptionId,
    );
    expect(collected.rewardSubscriptionId).toEqual(expect.any(String));
  });
});
