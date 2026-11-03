import { createHmac, randomUUID } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { PgBoss } from 'pg-boss';
import { PrismaClient } from '../../src/generated/prisma/client';
import {
  changeStaffRole,
  createStaffMember,
} from '../../src/booking/staff/staff-management';
import { PrismaStaffManagementUnitOfWork } from '../../src/booking/staff/prisma-staff-management';
import { applyDevelopmentFixtures } from '../../src/development-fixtures/apply-development-fixtures';
import { buildDevelopmentFixtures } from '../../src/development-fixtures/development-fixtures';
import type { AuthenticatedPrincipal } from '../../src/system-identity/authentication/resolve-authenticated-principal';
import { inviteClient } from '../../src/system-identity/invitations/client-invitations';
import { PrismaClientInvitationUnitOfWork } from '../../src/system-identity/invitations/prisma-client-invitation-unit-of-work';
import { PrismaClientRegistrationUnitOfWork } from '../../src/system-identity/registration/prisma-client-registration-unit-of-work';
import { RegisterClient } from '../../src/system-identity/registration/register-client';
import { AuthenticationLinkCipher } from '../../src/system-identity/security/authentication-link-cipher';
import { authenticationTokens } from '../../src/system-identity/security/authentication-token-service';
import {
  DatabaseTestContext,
  startDatabaseTestContext,
} from './database-test-context';

const digestEmail = (email: string): Buffer =>
  createHmac('sha256', 'test-email-digest-key').update(email).digest();
const linkCipher = () =>
  new AuthenticationLinkCipher('local-test-key', Buffer.alloc(32, 7));

// BKM-017 (owner 2026-11-02): every new Client and every Trainer gets a
// readable code from her name, without the owner doing anything.
describe('Readable Referral Codes at creation (PostgreSQL)', () => {
  let context: DatabaseTestContext;
  let prisma: PrismaClient;
  let boss: PgBoss;
  const fixtures = buildDevelopmentFixtures({ today: new Date() });
  const now = new Date(Date.now() + 60_000);
  const principal = (key: string, role: 'administrator' | 'assistant') => {
    const member = fixtures.staffMembers.find(({ email }) =>
      email.startsWith(`${key}.`),
    )!;
    return prisma.account
      .findUniqueOrThrow({
        where: { staffMemberId: member.id },
        select: { id: true },
      })
      .then(({ id }): AuthenticatedPrincipal => ({
        accountId: id,
        authenticationSessionId: randomUUID(),
        identity: {
          kind: 'staff',
          staffMemberId: member.id,
          role,
          branchIds: [],
        },
      }));
  };
  const codeOf = async (email: string) => {
    const account = await prisma.account.findFirstOrThrow({
      where: { email, deletedAt: null },
      select: {
        client: { select: { referralCode: true } },
        staffMember: { select: { referralCode: true } },
      },
    });
    return (account.client ?? account.staffMember)!.referralCode;
  };
  const staffDependencies = () => ({
    unitOfWork: new PrismaStaffManagementUnitOfWork({
      prisma,
      boss,
      digestEmail,
      linkCipher: linkCipher(),
      tokenIssuer: authenticationTokens,
      now: () => now,
    }),
    now: () => now,
    newId: randomUUID,
  });

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
  });

  afterAll(async () => {
    await prisma?.$disconnect();
    await context?.stop();
  });

  it('gives a self-registered Client and an invited one readable codes', async () => {
    const registered = await new RegisterClient({
      unitOfWork: new PrismaClientRegistrationUnitOfWork({
        prisma,
        boss,
        digestEmail,
      }),
      passwordHasher: { hash: () => Promise.resolve('password-hash') },
      tokenIssuer: authenticationTokens,
      linkCipher: linkCipher(),
      now: () => now,
      newId: randomUUID,
      newReferralCode: () => `REF-${randomUUID()}`,
    }).execute({
      name: 'Renata Salinas',
      email: `renata-${randomUUID()}@example.com`,
      password: 'correct horse battery staple',
    });
    await expect(codeOf(registered.email)).resolves.toBe('RENATA');

    const invited = await inviteClient(
      {
        name: 'Renata Salinas',
        email: `renata-${randomUUID()}@example.com`,
        phone: null,
      },
      await principal('camila', 'assistant'),
      {
        unitOfWork: new PrismaClientInvitationUnitOfWork({
          prisma,
          boss,
          digestEmail,
          now: () => now,
        }),
        tokenIssuer: authenticationTokens,
        linkCipher: linkCipher(),
        now: () => now,
        newId: randomUUID,
        newReferralCode: () => `REF-${randomUUID()}`,
      },
    );
    await expect(codeOf(invited.email)).resolves.toBe('SALINAS');
  });

  it('gives a Trainer her code when she is created, and none to other Roles', async () => {
    const paola = await principal('paola', 'administrator');
    const branchIds = [fixtures.branches[0].id];

    const trainer = await createStaffMember(
      {
        name: 'Renata Ríos',
        email: `renata.rios-${randomUUID()}@example.com`,
        phone: null,
        role: 'trainer',
        branchIds,
      },
      paola,
      staffDependencies(),
    );
    await expect(codeOf(trainer.email)).resolves.toBe('RIOS');

    const assistant = await createStaffMember(
      {
        name: 'Olga Rivas',
        email: `olga-${randomUUID()}@example.com`,
        phone: null,
        role: 'assistant',
        branchIds,
      },
      paola,
      staffDependencies(),
    );
    await expect(codeOf(assistant.email)).resolves.toBeNull();

    // Becoming a Trainer gives her one too.
    await changeStaffRole(
      { staffMemberId: assistant.id, role: 'trainer' },
      paola,
      staffDependencies(),
    );
    await expect(codeOf(assistant.email)).resolves.toBe('OLGA');
  });
});
