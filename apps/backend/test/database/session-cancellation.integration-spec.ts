import { randomUUID } from 'node:crypto';
import { PrismaClient } from '../../src/generated/prisma/client';
import { PrismaBookingCommands } from '../../src/booking/commands/prisma-booking-commands';
import { createPrismaAdapter } from '../../src/database/prisma-adapter';
import { applyDevelopmentFixtures } from '../../src/development-fixtures/apply-development-fixtures';
import { buildDevelopmentFixtures } from '../../src/development-fixtures/development-fixtures';
import type { AuthenticatedPrincipal } from '../../src/system-identity/authentication/resolve-authenticated-principal';
import {
  DatabaseTestContext,
  startDatabaseTestContext,
} from './database-test-context';

const today = new Date('2026-09-21T00:00:00.000Z');
// Bookings take the database clock as created_at, so the command clock must
// not run behind it.
const now = new Date();

describe('Administrator Session cancellation', () => {
  let context: DatabaseTestContext;
  let prisma: PrismaClient;
  const fixtures = buildDevelopmentFixtures({ today });

  const principalOf = async (email: string): Promise<AuthenticatedPrincipal> => {
    const account = await prisma.account.findUniqueOrThrow({
      where: { email },
      select: {
        id: true,
        clientId: true,
        staffMember: {
          select: { id: true, role: true, branchAssignments: { select: { branchId: true } } },
        },
      },
    });
    if (account.staffMember === null) {
      return {
        accountId: account.id,
        authenticationSessionId: randomUUID(),
        identity: { kind: 'client', clientId: account.clientId! },
      };
    }
    return {
      accountId: account.id,
      authenticationSessionId: randomUUID(),
      identity: {
        kind: 'staff',
        staffMemberId: account.staffMember.id,
        role: account.staffMember.role.toLowerCase() as 'administrator',
        branchIds: account.staffMember.branchAssignments.map((a) => a.branchId),
      },
    };
  };

  beforeAll(async () => {
    context = await startDatabaseTestContext();
    prisma = new PrismaClient({ adapter: createPrismaAdapter(context.databaseUrl) });
    await applyDevelopmentFixtures(prisma, { fixtures, passwordHash: 'not-a-real-hash' });
  });

  afterAll(async () => {
    await prisma?.$disconnect();
    await context?.stop();
  });

  it('cancels the Session, refunds every booked Client, closes the waitlist, audits, and notifies', async () => {
    const commands = new PrismaBookingCommands(prisma, () => new Date());
    const lucia = await principalOf('lucia@example.com');
    const valeria = await principalOf('valeria@example.com');
    const admin = await principalOf('paola.mendoza@example.com');
    const session = fixtures.sessions
      .filter((s) => s.startsAt.getTime() > now.getTime() + 3 * 60 * 60 * 1_000)
      .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime())[0];
    const trainer = await principalOf(
      fixtures.staffMembers.find((m) => m.id === session.trainerStaffMemberId)!.email,
    );
    const luciaSubscription = await prisma.subscription.findFirstOrThrow({
      where: { clientId: lucia.identity.kind === 'client' ? lucia.identity.clientId : '' , state: 'ACTIVE' },
      select: { id: true, remainingClassAllowance: true },
    });

    const booking = await commands.create({ sessionId: session.id }, lucia);
    const waitlistEntry = await prisma.waitlistEntry.create({
      data: {
        sessionId: session.id,
        clientId: valeria.identity.kind === 'client' ? valeria.identity.clientId : '',
        joinedByAccountId: valeria.accountId,
        joinedAt: now,
      },
      select: { id: true },
    });

    await expect(commands.cancelSession({ sessionId: session.id }, trainer)).rejects.toThrow();

    await expect(
      commands.cancelSession({ sessionId: session.id }, admin),
    ).resolves.toEqual({ affectedBookings: 1 });

    await expect(
      prisma.session.findUniqueOrThrow({ where: { id: session.id } }),
    ).resolves.toMatchObject({
      state: 'CANCELLED',
      cancellationCause: 'NO_SUBSTITUTE_TRAINER',
      cancelledAt: expect.any(Date),
      cancelledByAccountId: admin.accountId,
    });
    await expect(
      prisma.booking.findUniqueOrThrow({ where: { id: booking.id } }),
    ).resolves.toMatchObject({
      state: 'CANCELLED',
      cancellationCause: 'SESSION_CANCELLED',
      cancelledByAccountId: admin.accountId,
    });
    await expect(
      prisma.subscription.findUniqueOrThrow({ where: { id: luciaSubscription.id } }),
    ).resolves.toMatchObject({
      remainingClassAllowance: luciaSubscription.remainingClassAllowance,
    });
    await expect(
      prisma.waitlistEntry.findUniqueOrThrow({ where: { id: waitlistEntry.id } }),
    ).resolves.toMatchObject({ closureReason: 'SESSION_CANCELLED', closedAt: expect.any(Date) });
    await expect(
      prisma.auditRecord.findFirst({ where: { actionCode: 'session.cancelled', targetId: session.id } }),
    ).resolves.toMatchObject({ actorAccountId: admin.accountId, branchId: session.branchId });
    const classTypeName = fixtures.classTypes.find((c) => c.id === session.classTypeId)!.name;
    await expect(
      prisma.notification.findFirst({ where: { accountId: lucia.accountId, type: 'session_cancelled' } }),
    ).resolves.toMatchObject({
      message: `Tu clase de ${classTypeName} fue cancelada. Tu clase fue reembolsada a tu plan.`,
    });
    await expect(
      prisma.notification.count({ where: { accountId: valeria.accountId, type: 'session_cancelled' } }),
    ).resolves.toBe(1);
    await expect(
      prisma.notification.count({ where: { accountId: trainer.accountId, type: 'session_cancelled' } }),
    ).resolves.toBe(1);

    await expect(commands.cancelSession({ sessionId: session.id }, admin)).rejects.toThrow(
      'Session is not cancellable',
    );
  });
});
