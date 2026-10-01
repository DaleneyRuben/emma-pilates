import { createHmac, randomUUID } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { PgBoss } from 'pg-boss';
import { PrismaClient } from '../../src/generated/prisma/client';
import { applyDevelopmentFixtures } from '../../src/development-fixtures/apply-development-fixtures';
import { buildDevelopmentFixtures } from '../../src/development-fixtures/development-fixtures';
import {
  createStaffMember,
  StaffManagementError,
  type StaffManagementDependencies,
} from '../../src/booking/staff/staff-management';
import {
  cancelStaffInvitation,
  correctStaffInvitationEmail,
} from '../../src/booking/staff/staff-invitations';
import {
  createPrismaStaffDirectory,
  PrismaStaffManagementUnitOfWork,
} from '../../src/booking/staff/prisma-staff-management';
import type { AuthenticatedPrincipal } from '../../src/system-identity/authentication/resolve-authenticated-principal';
import { AuthenticationLinkCipher } from '../../src/system-identity/security/authentication-link-cipher';
import { authenticationTokens } from '../../src/system-identity/security/authentication-token-service';
import {
  DatabaseTestContext,
  startDatabaseTestContext,
} from './database-test-context';

const digestEmail = (email: string): Buffer =>
  createHmac('sha256', 'test-email-digest-key').update(email).digest();

// WEB-012: the pending Staff invitation's commands against PostgreSQL.
describe('Prisma staff invitations', () => {
  let context: DatabaseTestContext;
  let prisma: PrismaClient;
  let boss: PgBoss;
  let paola: AuthenticatedPrincipal;
  let clock = new Date(Date.now() + 60_000);
  const fixtures = buildDevelopmentFixtures({ today: new Date() });
  const staffId = (key: string) =>
    fixtures.staffMembers.find((member) => member.email.startsWith(`${key}.`))!
      .id;
  const centro = () =>
    fixtures.branches.find((branch) => branch.name === 'Centro')!.id;

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
      now: () => clock,
    }),
    now: () => clock,
    newId: randomUUID,
  });

  // Each email lands a minute later, clear of the recipient cooldown.
  const later = () => {
    clock = new Date(clock.getTime() + 61_000);
  };

  const invite = (email: string) =>
    createStaffMember(
      {
        name: 'Lucía Vaca',
        email,
        phone: null,
        role: 'trainer',
        branchIds: [centro()],
      },
      paola,
      dependencies(),
    );

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

  it('moves a pending invitation to a new address and kills the old link', async () => {
    const created = await invite('lucia.vacca@example.com');
    const oldLinks = await prisma.authenticationToken.findMany({
      where: { accountId: created.accountId, purpose: 'ACTIVATION' },
    });
    later();

    const corrected = await correctStaffInvitationEmail(
      { staffMemberId: created.id, email: 'lucia.vaca@example.com' },
      paola,
      dependencies(),
    );

    expect(corrected.email).toBe('lucia.vaca@example.com');
    const tokens = await prisma.authenticationToken.findMany({
      where: { accountId: created.accountId, purpose: 'ACTIVATION' },
    });
    expect(tokens).toHaveLength(oldLinks.length + 1);
    expect(
      tokens.filter(
        (token) => token.invalidatedAt === null && token.usedAt === null,
      ),
    ).toHaveLength(1);
  });

  it('reopens a pending invitation for the same email and refuses a Client’s', async () => {
    const created = await invite('rocio.reopen@example.com');
    later();

    await expect(invite('Rocio.Reopen@example.com')).resolves.toMatchObject({
      id: created.id,
      invitationReopened: true,
    });

    const promise = invite('lucia@example.com');
    await expect(promise).rejects.toBeInstanceOf(StaffManagementError);
    await expect(promise).rejects.toMatchObject({
      code: 'email_belongs_to_client',
    });
  });

  it('cancels a pending invitation by marking its rows removed', async () => {
    const created = await invite('cancel.me@example.com');

    await cancelStaffInvitation(
      { staffMemberId: created.id },
      paola,
      dependencies(),
    );

    await expect(
      prisma.account.findUniqueOrThrow({ where: { id: created.accountId } }),
    ).resolves.toMatchObject({ deletedAt: clock });
    await expect(
      prisma.staffMember.findUniqueOrThrow({ where: { id: created.id } }),
    ).resolves.toMatchObject({ deletedAt: clock });
    await expect(
      prisma.staffBranchAssignment.count({
        where: { staffMemberId: created.id, deletedAt: null },
      }),
    ).resolves.toBe(0);
    await expect(
      prisma.authenticationToken.count({
        where: {
          accountId: created.accountId,
          invalidatedAt: null,
          usedAt: null,
        },
      }),
    ).resolves.toBe(0);
    const page = await createPrismaStaffDirectory(prisma).list({
      page: 1,
      pageSize: 100,
    });
    expect(page.items.map((member) => member.id)).not.toContain(created.id);

    // The address is free again for a new invitation.
    later();
    await expect(invite('cancel.me@example.com')).resolves.toMatchObject({
      status: 'pending',
    });
  });
});
