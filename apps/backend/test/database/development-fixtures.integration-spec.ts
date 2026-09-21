import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../src/generated/prisma/client';
import { createCatalogRepository } from '../../src/booking/catalog/prisma-catalog-repository';
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

  beforeAll(async () => {
    context = await startDatabaseTestContext();
    prisma = new PrismaClient({ adapter: new PrismaPg(context.pool) });
    const passwordHash = await hashPassword(DEVELOPMENT_FIXTURE_PASSWORD);
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
  });

  it('creates active Client Accounts that authenticate with the shared password', async () => {
    const account = await prisma.account.findUniqueOrThrow({
      where: { email: 'lucia@example.com' },
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
    const trainer = await prisma.account.findUniqueOrThrow({
      where: { email: 'emma.vargas@example.com' },
      include: { staffMember: { include: { branchAssignments: true } } },
    });
    const administrator = await prisma.account.findUniqueOrThrow({
      where: { email: 'paola.mendoza@example.com' },
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
