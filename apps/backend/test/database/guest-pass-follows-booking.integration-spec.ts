import { randomUUID } from 'node:crypto';
import { PrismaClient } from '../../src/generated/prisma/client';
import { PrismaBookingCommands } from '../../src/booking/commands/prisma-booking-commands';
import { openGuestPass } from '../../src/booking/payments/open-guest-pass';
import { createFixture } from './booking-command-test-support';
import { createPrismaAdapter } from '../../src/database/prisma-adapter';
import { applyDevelopmentFixtures } from '../../src/development-fixtures/apply-development-fixtures';
import { buildDevelopmentFixtures } from '../../src/development-fixtures/development-fixtures';
import {
  DatabaseTestContext,
  startDatabaseTestContext,
} from './database-test-context';

const today = new Date('2026-09-21T00:00:00.000Z');

describe('guest pass follows the booking', () => {
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

  it('keeps the guest pass on the replacement when she reschedules', async () => {
    const bookedAt = new Date('2026-09-23T15:00:00.000Z');
    const fixture = await createFixture(prisma, {
      capacity: 8,
      startsAt: new Date('2026-09-23T16:00:00.000Z'),
      now: bookedAt,
    });
    const host = await prisma.client.create({
      data: {
        name: 'Anfitriona reagenda',
        referralCode: `REF-${randomUUID()}`,
      },
    });
    const friend = await prisma.client.create({
      data: {
        name: 'Invitada que reagenda',
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
        now: bookedAt,
      }),
    );
    const commands = new PrismaBookingCommands(prisma, () => bookedAt);
    const principal = {
      accountId: friendAccount.id,
      authenticationSessionId: randomUUID(),
      identity: { kind: 'client' as const, clientId: friend.id },
    };
    const booked = await commands.create(
      { sessionId: fixture.sessionId },
      principal,
    );
    const source = await prisma.session.findUniqueOrThrow({
      where: { id: fixture.sessionId },
      select: { classTypeId: true },
    });
    const replacement = await prisma.session.create({
      data: {
        branchId: fixture.branchId,
        classTypeId: source.classTypeId,
        trainerStaffMemberId: fixture.trainerId,
        startsAt: new Date('2026-09-23T20:00:00.000Z'),
        endsAt: new Date('2026-09-23T21:00:00.000Z'),
        capacity: 8,
      },
      select: { id: true },
    });
    const afterBooking = new PrismaBookingCommands(
      prisma,
      () => new Date(bookedAt.getTime() + 60_000),
    );

    const moved = await afterBooking.reschedule(
      { bookingId: booked.id, targetSessionId: replacement.id },
      principal,
    );

    await expect(
      prisma.guestPass.findFirstOrThrow({
        where: { friendClientId: friend.id, deletedAt: null },
        select: { bookingId: true },
      }),
    ).resolves.toEqual({ bookingId: moved.id });

    await afterBooking.cancel({ bookingId: moved.id }, principal);
    const lastPlace = await prisma.session.create({
      data: {
        branchId: fixture.branchId,
        classTypeId: source.classTypeId,
        trainerStaffMemberId: fixture.trainerId,
        startsAt: new Date('2026-09-24T16:00:00.000Z'),
        endsAt: new Date('2026-09-24T17:00:00.000Z'),
        capacity: 1,
      },
      select: { id: true },
    });
    await expect(
      afterBooking.create({ sessionId: lastPlace.id }, principal),
    ).rejects.toThrow('guest_pass_last_place');
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
      { sessionId: fixture.sessionId },
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

  it('refuses a guest pass reschedule onto the last place', async () => {
    const bookedAt = new Date('2026-09-23T15:00:00.000Z');
    const fixture = await createFixture(prisma, {
      capacity: 8,
      startsAt: new Date('2026-09-23T16:00:00.000Z'),
      now: bookedAt,
    });
    const host = await prisma.client.create({
      data: { name: 'Anfitriona último', referralCode: `REF-${randomUUID()}` },
    });
    const friend = await prisma.client.create({
      data: { name: 'Invitada último', referralCode: `REF-${randomUUID()}` },
    });
    const friendAccount = await prisma.account.create({
      data: { email: `${randomUUID()}@example.com`, clientId: friend.id },
    });
    await prisma.$transaction((transaction) =>
      openGuestPass(transaction, {
        hostClientId: host.id,
        friendClientId: friend.id,
        authorAccountId: fixture.accountId,
        now: bookedAt,
      }),
    );
    const commands = new PrismaBookingCommands(prisma, () => bookedAt);
    const principal = {
      accountId: friendAccount.id,
      authenticationSessionId: randomUUID(),
      identity: { kind: 'client' as const, clientId: friend.id },
    };
    const booked = await commands.create(
      { sessionId: fixture.sessionId },
      principal,
    );
    const source = await prisma.session.findUniqueOrThrow({
      where: { id: fixture.sessionId },
      select: { classTypeId: true },
    });
    const lastPlace = await prisma.session.create({
      data: {
        branchId: fixture.branchId,
        classTypeId: source.classTypeId,
        trainerStaffMemberId: fixture.trainerId,
        startsAt: new Date('2026-09-23T20:00:00.000Z'),
        endsAt: new Date('2026-09-23T21:00:00.000Z'),
        capacity: 1,
      },
      select: { id: true },
    });

    await expect(
      commands.reschedule(
        { bookingId: booked.id, targetSessionId: lastPlace.id },
        principal,
      ),
    ).rejects.toThrow('guest_pass_last_place');
  });
});
