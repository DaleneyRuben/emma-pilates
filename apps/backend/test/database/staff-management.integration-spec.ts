import { createHmac, randomUUID } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { PgBoss } from 'pg-boss';
import { PrismaClient } from '../../src/generated/prisma/client';
import { applyDevelopmentFixtures } from '../../src/development-fixtures/apply-development-fixtures';
import { buildDevelopmentFixtures } from '../../src/development-fixtures/development-fixtures';
import { AUTHENTICATION_EMAIL_QUEUE } from '../../src/jobs/authentication-email/authentication-email-job';
import {
  changeStaffBranches,
  changeStaffRole,
  createStaffMember,
  deactivateStaffMember,
  StaffManagementError,
  type StaffManagementDependencies,
} from '../../src/booking/staff/staff-management';
import {
  createPrismaStaffDirectory,
  PrismaStaffManagementUnitOfWork,
} from '../../src/booking/staff/prisma-staff-management';
import { PrismaAuthenticationGateway } from '../../src/system-identity/authentication/prisma-authentication-gateway';
import type { AuthenticatedPrincipal } from '../../src/system-identity/authentication/resolve-authenticated-principal';
import { AuthenticationLinkCipher } from '../../src/system-identity/security/authentication-link-cipher';
import { authenticationTokens } from '../../src/system-identity/security/authentication-token-service';
import {
  DatabaseTestContext,
  startDatabaseTestContext,
} from './database-test-context';

const digestEmail = (email: string): Buffer =>
  createHmac('sha256', 'test-email-digest-key').update(email).digest();

describe('Prisma staff management', () => {
  let context: DatabaseTestContext;
  let prisma: PrismaClient;
  let boss: PgBoss;
  let paola: AuthenticatedPrincipal;
  const now = new Date(Date.now() + 60_000);
  const fixtures = buildDevelopmentFixtures({ today: new Date() });
  const staffId = (key: string) =>
    fixtures.staffMembers.find((member) => member.email.startsWith(`${key}.`))!
      .id;
  const branchId = (name: string) =>
    fixtures.branches.find((branch) => branch.name === name)!.id;

  const dependencies = (): StaffManagementDependencies => ({
    unitOfWork: new PrismaStaffManagementUnitOfWork({
      prisma,
      boss,
      digestEmail,
      linkCipher: new AuthenticationLinkCipher(
        'local-test-key',
        Buffer.alloc(32, 7),
      ),
      tokenIssuer: authenticationTokens,
      now: () => now,
    }),
    now: () => now,
    newId: randomUUID,
  });

  const rejectsWith = async (promise: Promise<unknown>, code: string) => {
    await expect(promise).rejects.toBeInstanceOf(StaffManagementError);
    await expect(promise).rejects.toMatchObject({ code });
  };

  beforeAll(async () => {
    context = await startDatabaseTestContext();
    prisma = new PrismaClient({ adapter: new PrismaPg(context.pool) });
    boss = new PgBoss({
      db: {
        executeSql: async (text, values) => {
          const result = await context.pool.query(text, values);
          return { rows: result.rows };
        },
      },
      schema: 'pgboss',
      migrate: false,
    });
    await applyDevelopmentFixtures(prisma, {
      fixtures,
      passwordHash: 'not-a-real-hash',
    });
    const account = await prisma.account.findUniqueOrThrow({
      where: { staffMemberId: staffId('paola') },
      select: { id: true },
    });
    paola = {
      accountId: account.id,
      authenticationSessionId: randomUUID(),
      identity: {
        kind: 'staff',
        staffMemberId: staffId('paola'),
        role: 'administrator',
        branchIds: [],
      },
    };
  });

  afterAll(async () => {
    await prisma?.$disconnect();
    await context?.stop();
  });

  it('creates a pending Trainer with its Branch, Activation Link email, and audit, and lists it', async () => {
    const created = await createStaffMember(
      {
        name: 'Rocío Paz',
        email: 'Rocio.Paz@example.com',
        phone: null,
        role: 'trainer',
        branchIds: [branchId('Centro')],
      },
      paola,
      dependencies(),
    );

    expect(created).toMatchObject({
      name: 'Rocío Paz',
      email: 'rocio.paz@example.com',
      role: 'trainer',
      branchIds: [branchId('Centro')],
      status: 'pending',
      activationExpiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1_000),
    });
    const jobs = await boss.findJobs(AUTHENTICATION_EMAIL_QUEUE, {
      id: undefined,
    });
    expect(jobs.map(({ data }) => data)).toContainEqual(
      expect.objectContaining({
        accountId: created.accountId,
        purpose: 'activation',
      }),
    );
    await expect(
      prisma.auditRecord.findFirstOrThrow({
        where: {
          actionCode: 'staff_member.created',
          targetId: created.accountId,
        },
      }),
    ).resolves.toMatchObject({
      actorAccountId: paola.accountId,
      actorRole: 'ADMINISTRATOR',
      targetType: 'account',
    });

    const page = await createPrismaStaffDirectory(prisma).list({
      page: 1,
      pageSize: 50,
      role: 'trainer',
    });
    expect(page.totalItems).toBe(4);
    expect(page.items.map((member) => member.name)).toContain('Rocío Paz');
  });

  it('ends the Nutritionist’s blocks when her Role changes and withdraws their unbooked slots', async () => {
    const gabriela = staffId('gabriela');

    const changed = await changeStaffRole(
      { staffMemberId: gabriela, role: 'assistant' },
      paola,
      dependencies(),
    );

    expect(changed.role).toBe('assistant');
    const openBlocks = await prisma.availabilityBlock.count({
      where: { nutritionistStaffMemberId: gabriela, effectiveUntil: null },
    });
    expect(openBlocks).toBe(0);
    await expect(
      prisma.evaluationSlot.count({
        where: {
          nutritionistStaffMemberId: gabriela,
          state: 'PUBLISHED',
          startsAt: { gt: new Date(now.getTime() + 24 * 60 * 60 * 1_000) },
        },
      }),
    ).resolves.toBe(0);
  });

  it('refuses to remove a Branch where the Trainer leads upcoming Sessions and changes nothing', async () => {
    const emma = staffId('emma');
    const before = await prisma.staffBranchAssignment.count({
      where: { staffMemberId: emma },
    });

    await rejectsWith(
      changeStaffBranches(
        { staffMemberId: emma, branchIds: [branchId('Equipetrol')] },
        paola,
        dependencies(),
      ),
      'trainer_has_upcoming_sessions',
    );
    await expect(
      prisma.staffBranchAssignment.count({ where: { staffMemberId: emma } }),
    ).resolves.toBe(before);
  });

  it('marks a removed Branch assignment removed, keeps it, and grants its Branch again only when re-added', async () => {
    const created = await createStaffMember(
      {
        name: 'Julia Rivas',
        email: `julia.${randomUUID()}@example.com`,
        phone: null,
        role: 'assistant',
        branchIds: [branchId('Centro'), branchId('Equipetrol')],
      },
      paola,
      dependencies(),
    );
    const directory = createPrismaStaffDirectory(prisma);
    const credentialDigest = Buffer.from(randomUUID());
    await prisma.authenticationSession.create({
      data: {
        accountId: created.accountId,
        surface: 'MOBILE',
        credentialDigest,
        lastMeaningfulActivityAt: now,
        createdAt: now,
        idleExpiresAt: new Date(now.getTime() + 60_000),
        absoluteExpiresAt: new Date(now.getTime() + 120_000),
      },
    });
    const principalBranches = async () =>
      (
        await new PrismaAuthenticationGateway(
          prisma,
        ).findSessionByCredentialDigest(credentialDigest)
      )?.staffMember?.branchIds.sort();

    await changeStaffBranches(
      { staffMemberId: created.id, branchIds: [branchId('Centro')] },
      paola,
      dependencies(),
    );

    await expect(
      prisma.staffBranchAssignment.findMany({
        where: {
          staffMemberId: created.id,
          branchId: branchId('Equipetrol'),
        },
        select: { deletedAt: true },
      }),
    ).resolves.toEqual([{ deletedAt: now }]);
    await expect(directory.read(created.id)).resolves.toMatchObject({
      branchIds: [branchId('Centro')],
    });
    await expect(
      directory.list({
        page: 1,
        pageSize: 50,
        branchId: branchId('Equipetrol'),
      }),
    ).resolves.toMatchObject({
      items: expect.not.arrayContaining([
        expect.objectContaining({ id: created.id }),
      ]) as unknown[],
    });
    await expect(principalBranches()).resolves.toEqual([branchId('Centro')]);

    await changeStaffBranches(
      {
        staffMemberId: created.id,
        branchIds: [branchId('Centro'), branchId('Equipetrol')],
      },
      paola,
      dependencies(),
    );

    await expect(
      prisma.staffBranchAssignment.count({
        where: { staffMemberId: created.id },
      }),
    ).resolves.toBe(3);
    await expect(principalBranches()).resolves.toEqual(
      [branchId('Centro'), branchId('Equipetrol')].sort(),
    );
  });

  it('deactivates an Assistant by disabling the Account and revoking her sessions', async () => {
    const camila = staffId('camila');
    const account = await prisma.account.findUniqueOrThrow({
      where: { staffMemberId: camila },
      select: { id: true },
    });
    await prisma.authenticationSession.create({
      data: {
        accountId: account.id,
        surface: 'MOBILE',
        credentialDigest: Buffer.from(randomUUID()),
        lastMeaningfulActivityAt: now,
        createdAt: now,
        idleExpiresAt: new Date(now.getTime() + 60_000),
        absoluteExpiresAt: new Date(now.getTime() + 120_000),
      },
    });

    const deactivated = await deactivateStaffMember(
      { staffMemberId: camila },
      paola,
      dependencies(),
    );

    expect(deactivated.status).toBe('deactivated');
    await expect(
      prisma.authenticationSession.findMany({
        where: { accountId: account.id },
        select: { revocationReason: true },
      }),
    ).resolves.toEqual([{ revocationReason: 'ACCOUNT_DISABLED' }]);
  });

  it('counts only activated Administrators when protecting the last one', async () => {
    const pending = await createStaffMember(
      {
        name: 'Nueva Administradora',
        email: 'nueva.admin@example.com',
        phone: null,
        role: 'administrator',
        branchIds: [],
      },
      paola,
      dependencies(),
    );
    const actingAsPending: AuthenticatedPrincipal = {
      ...paola,
      accountId: pending.accountId,
      identity: {
        ...paola.identity,
        staffMemberId: pending.id,
      } as AuthenticatedPrincipal['identity'],
    };

    await rejectsWith(
      deactivateStaffMember(
        { staffMemberId: staffId('paola') },
        actingAsPending,
        dependencies(),
      ),
      'last_administrator',
    );
  });
});
