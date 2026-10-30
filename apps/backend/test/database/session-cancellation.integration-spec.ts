import { randomUUID } from 'node:crypto';
import { PrismaClient } from '../../src/generated/prisma/client';
import { PrismaBookingCommands } from '../../src/booking/commands/prisma-booking-commands';
import { createPrismaAdapter } from '../../src/database/prisma-adapter';
import { applyDevelopmentFixtures } from '../../src/development-fixtures/apply-development-fixtures';
import { buildDevelopmentFixtures } from '../../src/development-fixtures/development-fixtures';
import type { AuthenticatedPrincipal } from '../../src/system-identity/authentication/resolve-authenticated-principal';
import { boliviaDate } from '../../src/time/bolivia-time';
import {
  DatabaseTestContext,
  startDatabaseTestContext,
} from './database-test-context';
import { impersonating, openImpersonation } from './impersonation-test-support';

// Bookings take the database clock as created_at, so the command clock must
// not run behind it, and the fixtures follow that same clock.
const now = new Date();
const today = boliviaDate(now);

describe('Administrator Session cancellation', () => {
  let context: DatabaseTestContext;
  let prisma: PrismaClient;
  const fixtures = buildDevelopmentFixtures({ today });

  const principalOf = async (
    email: string,
  ): Promise<AuthenticatedPrincipal> => {
    const account = await prisma.account.findFirstOrThrow({
      where: { email, deletedAt: null },
      select: {
        id: true,
        clientId: true,
        staffMember: {
          select: {
            id: true,
            role: true,
            branchAssignments: { select: { branchId: true } },
          },
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
    prisma = new PrismaClient({
      adapter: createPrismaAdapter(context.databaseUrl),
    });
    await applyDevelopmentFixtures(prisma, {
      fixtures,
      passwordHash: 'not-a-real-hash',
    });
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
      fixtures.staffMembers.find((m) => m.id === session.trainerStaffMemberId)!
        .email,
    );
    const luciaSubscription = await prisma.subscription.findFirstOrThrow({
      where: {
        clientId:
          lucia.identity.kind === 'client' ? lucia.identity.clientId : '',
        state: 'ACTIVE',
      },
      select: { id: true, remainingClassAllowance: true },
    });

    const booking = await commands.create({ sessionId: session.id }, lucia);
    const waitlistEntry = await prisma.waitlistEntry.create({
      data: {
        sessionId: session.id,
        clientId:
          valeria.identity.kind === 'client' ? valeria.identity.clientId : '',
        joinedByAccountId: valeria.accountId,
        joinedAt: now,
      },
      select: { id: true },
    });

    await expect(
      commands.cancelSession({ sessionId: session.id }, trainer),
    ).rejects.toThrow();

    await expect(
      commands.cancelSession({ sessionId: session.id }, admin),
    ).resolves.toEqual({ affectedBookings: 1 });

    await expect(
      prisma.session.findUniqueOrThrow({ where: { id: session.id } }),
    ).resolves.toMatchObject({
      state: 'CANCELLED',
      cancellationCause: 'NO_SUBSTITUTE_TRAINER',
      cancelledAt: expect.any(Date) as Date,
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
      prisma.subscription.findUniqueOrThrow({
        where: { id: luciaSubscription.id },
      }),
    ).resolves.toMatchObject({
      remainingClassAllowance: luciaSubscription.remainingClassAllowance,
    });
    await expect(
      prisma.waitlistEntry.findUniqueOrThrow({
        where: { id: waitlistEntry.id },
      }),
    ).resolves.toMatchObject({
      closureReason: 'SESSION_CANCELLED',
      closedAt: expect.any(Date) as Date,
    });
    await expect(
      prisma.auditRecord.findFirst({
        where: { actionCode: 'session.cancelled', targetId: session.id },
      }),
    ).resolves.toMatchObject({
      actorAccountId: admin.accountId,
      branchId: session.branchId,
    });
    const classTypeName = fixtures.classTypes.find(
      (c) => c.id === session.classTypeId,
    )!.name;
    await expect(
      prisma.notification.findFirst({
        where: { accountId: lucia.accountId, type: 'session_cancelled' },
      }),
    ).resolves.toMatchObject({
      message: `Tu clase de ${classTypeName} fue cancelada. Tu clase fue reembolsada a tu plan.`,
    });
    await expect(
      prisma.notification.count({
        where: { accountId: valeria.accountId, type: 'session_cancelled' },
      }),
    ).resolves.toBe(1);
    await expect(
      prisma.notification.count({
        where: { accountId: trainer.accountId, type: 'session_cancelled' },
      }),
    ).resolves.toBe(1);

    await expect(
      commands.cancelSession({ sessionId: session.id }, admin),
    ).rejects.toThrow('Session is not cancellable');
  });

  // FIX-010 / ADR-0100: the audit record names who acted, with her Role; the
  // Session and Booking columns keep the acting Staff Member's Account.
  it('audits the Coordinator’s cancellation as hers, and as the Administrator’s while she is impersonated', async () => {
    const commands = new PrismaBookingCommands(prisma, () => new Date());
    const lucia = await principalOf('lucia@example.com');
    const carolina = await principalOf('carolina.rivas@example.com');
    const paola = await principalOf('paola.mendoza@example.com');
    const [own, impersonated] = fixtures.sessions
      .filter((s) => s.startsAt.getTime() > now.getTime() + 3 * 60 * 60 * 1_000)
      .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime())
      .slice(1, 3);
    const auditOf = (sessionId: string) =>
      prisma.auditRecord.findFirstOrThrow({
        where: { actionCode: 'session.cancelled', targetId: sessionId },
        select: {
          actorAccountId: true,
          actorRole: true,
          impersonationId: true,
        },
      });

    await commands.create({ sessionId: own.id }, lucia);
    await commands.cancelSession({ sessionId: own.id }, carolina);
    await expect(auditOf(own.id)).resolves.toEqual({
      actorAccountId: carolina.accountId,
      actorRole: 'COORDINATOR',
      impersonationId: null,
    });

    const booking = await commands.create(
      { sessionId: impersonated.id },
      lucia,
    );
    const impersonation = await openImpersonation(prisma, {
      administratorAccountId: paola.accountId,
      staffMemberId: (carolina.identity as { staffMemberId: string })
        .staffMemberId,
      now,
    });
    await commands.cancelSession(
      { sessionId: impersonated.id },
      impersonating(carolina, impersonation),
    );
    await expect(auditOf(impersonated.id)).resolves.toEqual({
      actorAccountId: paola.accountId,
      actorRole: 'ADMINISTRATOR',
      impersonationId: impersonation.id,
    });
    await expect(
      prisma.session.findUniqueOrThrow({ where: { id: impersonated.id } }),
    ).resolves.toMatchObject({ cancelledByAccountId: carolina.accountId });
    await expect(
      prisma.booking.findUniqueOrThrow({ where: { id: booking.id } }),
    ).resolves.toMatchObject({ cancelledByAccountId: carolina.accountId });
  });
});
