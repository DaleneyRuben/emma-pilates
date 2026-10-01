import { createHmac, randomUUID } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { PgBoss } from 'pg-boss';
import { AuthenticationTokenPurpose } from '../../src/generated/prisma/enums';
import { PrismaClient } from '../../src/generated/prisma/client';
import { applyDevelopmentFixtures } from '../../src/development-fixtures/apply-development-fixtures';
import { buildDevelopmentFixtures } from '../../src/development-fixtures/development-fixtures';
import type { AuthenticatedPrincipal } from '../../src/system-identity/authentication/resolve-authenticated-principal';
import {
  readClientInvitation,
  resendClientInvitation,
  type ClientInvitationDependencies,
} from '../../src/system-identity/invitations/client-invitations';
import { sendClientVerification } from '../../src/system-identity/invitations/client-verification-resend';
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
const linkCipher = new AuthenticationLinkCipher(
  'local-test-key',
  Buffer.alloc(32, 7),
);

// MOB-027: S06 must not manage a self-registered Client as an invitation.
describe('Client invitation unit of work with a pending self-registration', () => {
  let context: DatabaseTestContext;
  let prisma: PrismaClient;
  let boss: PgBoss;
  let assistant: AuthenticatedPrincipal;
  const now = new Date(Date.now() + 60_000);

  const dependencies = (): ClientInvitationDependencies => ({
    unitOfWork: new PrismaClientInvitationUnitOfWork({
      prisma,
      boss,
      digestEmail,
      now: () => now,
    }),
    tokenIssuer: authenticationTokens,
    linkCipher,
    now: () => now,
    newId: randomUUID,
    newReferralCode: () => `REF-${randomUUID()}`,
  });

  const registerHerself = async (): Promise<{
    accountId: string;
    clientId: string;
  }> => {
    const registration = await new RegisterClient({
      unitOfWork: new PrismaClientRegistrationUnitOfWork({
        prisma,
        boss,
        digestEmail,
      }),
      passwordHasher: { hash: () => Promise.resolve('argon2id-password-hash') },
      tokenIssuer: authenticationTokens,
      linkCipher,
      // Two minutes earlier, so the recipient throttle has room again.
      now: () => new Date(now.getTime() - 2 * 60_000),
      newId: randomUUID,
      newReferralCode: () => `REF-${randomUUID()}`,
    }).execute({
      name: 'Renata Áñez',
      email: `renata-${randomUUID()}@example.com`,
      password: 'correct horse battery staple',
    });
    const account = await prisma.account.findFirstOrThrow({
      where: { email: registration.email, deletedAt: null },
      select: { id: true, clientId: true },
    });
    return { accountId: account.id, clientId: account.clientId! };
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
      fixtures: buildDevelopmentFixtures({
        today: new Date('2026-09-21T00:00:00.000Z'),
      }),
      passwordHash: 'not-a-real-hash',
    });
    const camila = await prisma.account.findFirstOrThrow({
      where: { email: 'camila.rojas@example.com', deletedAt: null },
      select: { id: true, staffMemberId: true },
    });
    assistant = {
      accountId: camila.id,
      authenticationSessionId: randomUUID(),
      identity: {
        kind: 'staff',
        staffMemberId: camila.staffMemberId!,
        role: 'assistant',
        branchIds: [],
      },
    };
  });

  afterAll(async () => {
    await prisma?.$disconnect();
    await context?.stop();
  });

  it('neither reads nor resends her as an invitation, and issues no activation link', async () => {
    const { accountId, clientId } = await registerHerself();

    await expect(
      readClientInvitation({ clientId }, assistant, dependencies()),
    ).rejects.toThrow('Client verification pending');
    await expect(
      resendClientInvitation({ clientId }, assistant, dependencies()),
    ).rejects.toThrow('Client verification pending');
    await expect(
      prisma.authenticationToken.count({
        where: { accountId, purpose: AuthenticationTokenPurpose.ACTIVATION },
      }),
    ).resolves.toBe(0);
  });

  it('sends her a new verification link and stops the previous one', async () => {
    const { accountId, clientId } = await registerHerself();

    await expect(
      sendClientVerification({ clientId }, assistant, dependencies()),
    ).resolves.toMatchObject({ clientId });
    const verifications = await prisma.authenticationToken.findMany({
      where: { accountId, purpose: AuthenticationTokenPurpose.VERIFICATION },
      select: { invalidatedAt: true },
    });
    expect(verifications).toHaveLength(2);
    expect(
      verifications.filter(({ invalidatedAt }) => invalidatedAt === null),
    ).toHaveLength(1);
  });
});
