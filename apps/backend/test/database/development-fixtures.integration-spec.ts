import { randomUUID } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../src/generated/prisma/client';
import { createCatalogRepository } from '../../src/booking/catalog/prisma-catalog-repository';
import { createPrismaEvaluationCommands } from '../../src/booking/evaluations/prisma-evaluation-commands';
import { createPrismaPaymentCommands } from '../../src/booking/payments/prisma-payment-commands';
import type { AuthenticatedPrincipal } from '../../src/system-identity/authentication/resolve-authenticated-principal';
import { applyDevelopmentFixtures } from '../../src/development-fixtures/apply-development-fixtures';
import {
  buildDevelopmentFixtures,
  DEVELOPMENT_FIXTURE_PASSWORD,
} from '../../src/development-fixtures/development-fixtures';
import {
  hashPassword,
  verifyPassword,
} from '../../src/system-identity/security/argon2-password-hasher';
import {
  DatabaseTestContext,
  startDatabaseTestContext,
} from './database-test-context';

describe('development fixtures', () => {
  let context: DatabaseTestContext;
  let prisma: PrismaClient;
  const today = new Date('2026-09-21T00:00:00.000Z');
  const fixtures = buildDevelopmentFixtures({ today });

  let passwordHash: string;

  beforeAll(async () => {
    context = await startDatabaseTestContext();
    prisma = new PrismaClient({ adapter: new PrismaPg(context.pool) });
    passwordHash = await hashPassword(DEVELOPMENT_FIXTURE_PASSWORD);
    await applyDevelopmentFixtures(prisma, { fixtures, passwordHash });
    await applyDevelopmentFixtures(prisma, { fixtures, passwordHash });
  });

  afterAll(async () => {
    await prisma?.$disconnect();
    await context?.stop();
  });

  it('applies idempotently without duplicating rows', async () => {
    await expect(prisma.account.count()).resolves.toBe(
      fixtures.staffMembers.length + fixtures.clients.length,
    );
    await expect(prisma.session.count()).resolves.toBe(
      fixtures.sessions.length,
    );
    await expect(prisma.sessionSchedule.count()).resolves.toBe(
      fixtures.sessionSchedules.length,
    );
    await expect(prisma.subscription.count()).resolves.toBe(
      fixtures.subscriptions.length,
    );
    await expect(prisma.payment.count()).resolves.toBe(
      fixtures.payments.length,
    );
    await expect(prisma.referral.count()).resolves.toBe(
      fixtures.referrals.length,
    );
    await expect(prisma.creditLedgerEntry.count()).resolves.toBe(0);
  });

  it('restores drifted Session times on re-application without touching Session state', async () => {
    const session = fixtures.sessions[0];
    await prisma.$executeRaw`
      UPDATE booking.sessions
      SET starts_at = starts_at + interval '4 hours',
          ends_at = ends_at + interval '4 hours',
          state = 'cancelled'::booking."SessionState",
          cancellation_cause = 'zero_bookings'::booking."SessionCancellationCause",
          cancelled_at = now()
      WHERE id = ${session.id}::uuid
    `;

    await applyDevelopmentFixtures(prisma, { fixtures, passwordHash });

    const stored = await prisma.session.findUniqueOrThrow({
      where: { id: session.id },
    });
    expect(stored.startsAt).toEqual(session.startsAt);
    expect(stored.endsAt).toEqual(session.endsAt);
    expect(stored.state).toBe('CANCELLED');
  });

  it('keeps a Session the worker already materialized at a fixture start instead of failing', async () => {
    const session = fixtures.sessions[1];
    const materializedId = randomUUID();
    await prisma.session.delete({ where: { id: session.id } });
    await prisma.session.create({ data: { ...session, id: materializedId } });

    await applyDevelopmentFixtures(prisma, { fixtures, passwordHash });

    await expect(
      prisma.session.findMany({
        where: {
          sessionScheduleId: session.sessionScheduleId,
          startsAt: session.startsAt,
        },
        select: { id: true },
      }),
    ).resolves.toEqual([{ id: materializedId }]);
  });

  it('lets Sofía read her referral code and both pending referrals, and no Credit, through the payment reads', async () => {
    const account = await prisma.account.findFirstOrThrow({
      where: { email: 'sofia@example.com', deletedAt: null },
      select: { id: true, clientId: true },
    });
    const sofia: AuthenticatedPrincipal = {
      accountId: account.id,
      authenticationSessionId: randomUUID(),
      identity: { kind: 'client', clientId: account.clientId! },
    };
    const commands = createPrismaPaymentCommands(prisma, {
      now: () => today,
    });

    await expect(commands.readCreditSummary(sofia)).resolves.toMatchObject({
      availableCentavos: 0,
      reservedCentavos: 0,
    });
    await expect(commands.readReferrals(sofia)).resolves.toMatchObject({
      referralCode: 'REF-SOFIA',
      referrals: [
        { referredName: 'Mariana P.', state: 'pending' },
        { referredName: 'Valeria Q.', state: 'pending', awardCentavos: null },
      ],
    });
  });

  it("publishes Gabriela's Availability Blocks with their 30-day slots once", async () => {
    const account = await prisma.account.findFirstOrThrow({
      where: { email: 'gabriela.flores@example.com', deletedAt: null },
      select: {
        id: true,
        staffMember: {
          select: {
            id: true,
            branchAssignments: { select: { branchId: true } },
          },
        },
      },
    });
    const gabriela: AuthenticatedPrincipal = {
      accountId: account.id,
      authenticationSessionId: randomUUID(),
      identity: {
        kind: 'staff',
        staffMemberId: account.staffMember!.id,
        role: 'nutritionist',
        branchIds: account.staffMember!.branchAssignments.map(
          ({ branchId }) => branchId,
        ),
      },
    };
    const slotCount = await prisma.evaluationSlot.count();

    await applyDevelopmentFixtures(prisma, { fixtures, passwordHash });

    await expect(prisma.evaluationSlot.count()).resolves.toBe(slotCount);
    expect(slotCount).toBeGreaterThan(0);
    await expect(
      createPrismaEvaluationCommands(prisma, {
        now: () => new Date(),
      }).listAvailabilityBlocks(gabriela),
    ).resolves.toMatchObject([
      { weekday: 1, startsAtLocal: '09:00', slotsPerWeek: 5 },
      { weekday: 4, startsAtLocal: '15:00', slotsPerWeek: 4 },
      { weekday: 6, startsAtLocal: '09:00', slotsPerWeek: 4 },
    ]);
  });

  it('creates active Client Accounts that authenticate with the shared password', async () => {
    const account = await prisma.account.findFirstOrThrow({
      where: { email: 'lucia@example.com', deletedAt: null },
      include: { client: true },
    });

    expect(account.emailVerifiedAt).not.toBeNull();
    expect(account.activatedAt).not.toBeNull();
    expect(account.disabledAt).toBeNull();
    expect(account.client?.name).toBe('Lucía Fernández');
    await expect(
      verifyPassword(account.passwordHash ?? '', DEVELOPMENT_FIXTURE_PASSWORD),
    ).resolves.toBe(true);
  });

  it('creates one active Staff Account per Role with Branch assignments', async () => {
    const trainer = await prisma.account.findFirstOrThrow({
      where: { email: 'emma.vargas@example.com', deletedAt: null },
      include: { staffMember: { include: { branchAssignments: true } } },
    });
    const administrator = await prisma.account.findFirstOrThrow({
      where: { email: 'paola.mendoza@example.com', deletedAt: null },
      include: { staffMember: true },
    });

    expect(trainer.activatedAt).not.toBeNull();
    expect(trainer.staffMember?.role).toBe('TRAINER');
    expect(trainer.staffMember?.branchAssignments).toHaveLength(3);
    expect(administrator.staffMember?.role).toBe('ADMINISTRATOR');
  });

  it('exposes the catalog and Subscription states through the Booking repository', async () => {
    const repository = createCatalogRepository(prisma);
    const lucia = fixtures.clients.find((c) => c.email === 'lucia@example.com');
    const sofia = fixtures.clients.find((c) => c.email === 'sofia@example.com');
    const centro = fixtures.branches.find((b) => b.name === 'Centro');

    await expect(repository.listVisiblePlans()).resolves.toHaveLength(4);
    await expect(
      repository.findActiveSubscription(lucia!.id, today),
    ).resolves.toMatchObject({ remainingClassAllowance: 5 });
    await expect(
      repository.findActiveSubscription(sofia!.id, today),
    ).resolves.toBeNull();
    await expect(
      repository.listScheduledSessions({
        branchId: centro!.id,
        from: today,
        until: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1_000),
        limit: 50,
      }),
    ).resolves.not.toHaveLength(0);
  });
});
