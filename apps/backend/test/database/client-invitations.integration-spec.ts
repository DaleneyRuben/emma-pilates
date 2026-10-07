import { createHmac, randomUUID } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { PgBoss } from 'pg-boss';
import {
  AuthenticationThrottleEventKind,
  AuthenticationTokenPurpose,
} from '../../src/generated/prisma/enums';
import { PrismaClient } from '../../src/generated/prisma/client';
import { AUTHENTICATION_EMAIL_QUEUE } from '../../src/jobs/authentication-email/authentication-email-job';
import { applyDevelopmentFixtures } from '../../src/development-fixtures/apply-development-fixtures';
import { buildDevelopmentFixtures } from '../../src/development-fixtures/development-fixtures';
import type { AuthenticatedPrincipal } from '../../src/system-identity/authentication/resolve-authenticated-principal';
import {
  cancelClientInvitation,
  correctClientInvitationEmail,
  InvitationHasActivityError,
  inviteClient,
  readClientInvitation,
  type ClientInvitationDependencies,
} from '../../src/system-identity/invitations/client-invitations';
import { PrismaClientInvitationUnitOfWork } from '../../src/system-identity/invitations/prisma-client-invitation-unit-of-work';
import { CleanupExpiredPendingAccounts } from '../../src/system-identity/registration/cleanup-expired-pending-accounts';
import { PrismaClientRegistrationUnitOfWork } from '../../src/system-identity/registration/prisma-client-registration-unit-of-work';
import { AuthenticationLinkCipher } from '../../src/system-identity/security/authentication-link-cipher';
import { authenticationTokens } from '../../src/system-identity/security/authentication-token-service';
import {
  DatabaseTestContext,
  startDatabaseTestContext,
} from './database-test-context';

const day = 24 * 60 * 60 * 1_000;
const today = new Date('2026-09-21T00:00:00.000Z');
const digestEmail = (email: string): Buffer =>
  createHmac('sha256', 'test-email-digest-key').update(email).digest();

describe('Client invitation unit of work', () => {
  let context: DatabaseTestContext;
  let prisma: PrismaClient;
  let boss: PgBoss;
  let assistant: AuthenticatedPrincipal;
  const fixtures = buildDevelopmentFixtures({ today });
  const now = new Date(Date.now() + 60_000);

  const dependencies = (at: Date = now): ClientInvitationDependencies => ({
    unitOfWork: new PrismaClientInvitationUnitOfWork({
      prisma,
      boss,
      digestEmail,
      now: () => at,
    }),
    tokenIssuer: authenticationTokens,
    linkCipher: new AuthenticationLinkCipher(
      'local-test-key',
      Buffer.alloc(32, 7),
    ),
    now: () => at,
    newId: randomUUID,
    newReferralCode: () => `REF-${randomUUID()}`,
  });

  const invite = (email = `nueva-${randomUUID()}@example.com`) =>
    inviteClient(
      { name: '  Ana Nueva ', email, phone: '+591 70000000' },
      assistant,
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

  it('commits the pending Client, Account, activation link, throttle event, email job, and audit together', async () => {
    const result = await invite();

    const account = await prisma.account.findFirstOrThrow({
      where: { email: result.email, deletedAt: null },
      include: { client: true, authenticationTokens: true },
    });
    expect(result.status).toBe('invited');
    expect(account).toMatchObject({
      passwordHash: null,
      emailVerifiedAt: null,
      activatedAt: null,
      pendingExpiresAt: new Date(now.getTime() + 30 * day),
      clientId: result.clientId,
      client: { name: 'Ana Nueva', phone: '+591 70000000' },
    });
    expect(account.authenticationTokens).toEqual([
      expect.objectContaining({
        purpose: AuthenticationTokenPurpose.ACTIVATION,
        expiresAt: new Date(now.getTime() + 7 * day),
        usedAt: null,
        invalidatedAt: null,
      }),
    ]);
    await expect(
      prisma.authenticationThrottleEvent.count({
        where: {
          purpose: 'ACTIVATION',
          eventKind: AuthenticationThrottleEventKind.MESSAGE_ISSUED,
          recipientDigest: new Uint8Array(digestEmail(result.email)),
        },
      }),
    ).resolves.toBe(1);
    const jobs = await boss.findJobs(AUTHENTICATION_EMAIL_QUEUE, {
      id: undefined,
    });
    expect(
      jobs.find(
        ({ data }) =>
          typeof data === 'object' &&
          data !== null &&
          'accountId' in data &&
          data.accountId === account.id,
      )?.data,
    ).toMatchObject({ purpose: 'activation', accountId: account.id });
    await expect(
      prisma.auditRecord.findFirstOrThrow({
        where: {
          targetId: account.id,
          actionCode: 'client_invitation.created',
        },
      }),
    ).resolves.toMatchObject({
      outcome: 'SUCCEEDED',
      actorKind: 'ACCOUNT',
      actorAccountId: assistant.accountId,
      actorRole: 'ASSISTANT',
      targetType: 'account',
      occurredAt: now,
    });
  });

  it('reads the pending invitation but not activated Accounts or unknown Clients', async () => {
    const result = await invite();
    const lucia = fixtures.clients.find(
      (c) => c.email === 'lucia@example.com',
    )!;

    await expect(
      readClientInvitation(
        { clientId: result.clientId },
        assistant,
        dependencies(),
      ),
    ).resolves.toEqual({
      clientId: result.clientId,
      name: 'Ana Nueva',
      email: result.email,
      phone: '+591 70000000',
      pendingExpiresAt: new Date(now.getTime() + 30 * day),
      activationExpiresAt: new Date(now.getTime() + 7 * day),
      cancellable: true,
    });
    await expect(
      readClientInvitation({ clientId: lucia.id }, assistant, dependencies()),
    ).rejects.toThrow('Client invitation not found');
    await expect(
      readClientInvitation(
        { clientId: randomUUID() },
        assistant,
        dependencies(),
      ),
    ).rejects.toThrow('Client invitation not found');
  });

  it('corrects the email, invalidates the previous activation link, and issues a new one', async () => {
    const result = await invite();
    const correctedAt = new Date(now.getTime() + 2 * 60_000);
    const corrected = `corregida-${randomUUID()}@example.com`;

    await expect(
      correctClientInvitationEmail(
        { clientId: result.clientId, email: corrected.toUpperCase() },
        assistant,
        dependencies(correctedAt),
      ),
    ).resolves.toMatchObject({
      email: corrected,
      pendingExpiresAt: new Date(correctedAt.getTime() + 30 * day),
      activationExpiresAt: new Date(correctedAt.getTime() + 7 * day),
    });

    const account = await prisma.account.findFirstOrThrow({
      where: { email: corrected, deletedAt: null },
      include: { authenticationTokens: { orderBy: { issuedAt: 'asc' } } },
    });
    expect(account.clientId).toBe(result.clientId);
    expect(account.authenticationTokens).toHaveLength(2);
    expect(account.authenticationTokens[0]?.invalidatedAt).toEqual(correctedAt);
    expect(account.authenticationTokens[1]).toMatchObject({
      purpose: AuthenticationTokenPurpose.ACTIVATION,
      invalidatedAt: null,
      expiresAt: new Date(correctedAt.getTime() + 7 * day),
    });
    await expect(
      prisma.auditRecord.count({
        where: {
          targetId: account.id,
          actionCode: 'client_invitation.email_corrected',
        },
      }),
    ).resolves.toBe(1);
  });

  it('cancels an invitation without activity by marking its Account and Client removed and invalidating its links', async () => {
    const result = await invite();
    const account = await prisma.account.findFirstOrThrow({
      where: { email: result.email, deletedAt: null },
      select: { id: true },
    });

    await cancelClientInvitation(
      { clientId: result.clientId },
      assistant,
      dependencies(),
    );

    await expect(
      prisma.account.findUniqueOrThrow({ where: { id: account.id } }),
    ).resolves.toMatchObject({ deletedAt: expect.any(Date) as Date });
    await expect(
      prisma.client.findUniqueOrThrow({ where: { id: result.clientId } }),
    ).resolves.toMatchObject({ deletedAt: expect.any(Date) as Date });
    await expect(
      prisma.authenticationToken.count({
        where: { accountId: account.id, usedAt: null, invalidatedAt: null },
      }),
    ).resolves.toBe(0);
    await expect(
      prisma.auditRecord.findFirstOrThrow({
        where: {
          targetId: account.id,
          actionCode: 'client_invitation.cancelled',
        },
      }),
    ).resolves.toMatchObject({
      actorAccountId: assistant.accountId,
      metadata: { email: result.email },
    });
  });

  it('keeps an invited Client who already holds a Subscription, both for cancellation and for expiry cleanup', async () => {
    const result = await invite();
    const plan = fixtures.plans[0];
    await prisma.subscription.create({
      data: {
        clientId: result.clientId,
        planId: plan.id,
        planNameSnapshot: plan.name,
        durationMonthsSnapshot: plan.durationMonths,
        originalClassAllowance: plan.classAllowance,
        remainingClassAllowance: plan.classAllowance,
        startsOn: today,
        endsOn: new Date(today.getTime() + 30 * day),
        state: 'ACTIVE',
        activatedAt: now,
      },
    });

    await expect(
      readClientInvitation(
        { clientId: result.clientId },
        assistant,
        dependencies(),
      ),
    ).resolves.toMatchObject({ cancellable: false });
    await expect(
      cancelClientInvitation(
        { clientId: result.clientId },
        assistant,
        dependencies(),
      ),
    ).rejects.toBeInstanceOf(InvitationHasActivityError);

    const cleanup = new CleanupExpiredPendingAccounts({
      gateway: new PrismaClientRegistrationUnitOfWork({
        prisma,
        boss,
        digestEmail,
      }),
      now: () => new Date(now.getTime() + 31 * day),
      newId: randomUUID,
    });
    await cleanup.execute();

    await expect(
      prisma.client.findFirst({
        where: { id: result.clientId, deletedAt: null },
      }),
    ).resolves.not.toBeNull();
    await expect(
      prisma.account.findFirst({
        where: { email: result.email, deletedAt: null },
      }),
    ).resolves.not.toBeNull();
  });
});
