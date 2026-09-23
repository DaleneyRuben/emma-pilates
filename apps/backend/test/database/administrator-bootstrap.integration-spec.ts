import { createHmac, randomUUID } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { PgBoss } from 'pg-boss';
import {
  AuthenticationThrottleEventKind,
  AuthenticationTokenPurpose,
  StaffRole,
} from '../../src/generated/prisma/enums';
import { PrismaClient } from '../../src/generated/prisma/client';
import { AUTHENTICATION_EMAIL_QUEUE } from '../../src/jobs/authentication-email/authentication-email-job';
import {
  AdministratorAlreadyActiveError,
  bootstrapFirstAdministrator,
  BootstrapPendingForAnotherEmailError,
  type AdministratorBootstrapDependencies,
} from '../../src/system-identity/bootstrap/bootstrap-first-administrator';
import { PrismaAdministratorBootstrapUnitOfWork } from '../../src/system-identity/bootstrap/prisma-administrator-bootstrap-unit-of-work';
import { AuthenticationLinkCipher } from '../../src/system-identity/security/authentication-link-cipher';
import { authenticationTokens } from '../../src/system-identity/security/authentication-token-service';
import {
  DatabaseTestContext,
  startDatabaseTestContext,
} from './database-test-context';

const day = 24 * 60 * 60 * 1_000;
const digestEmail = (email: string): Buffer =>
  createHmac('sha256', 'test-email-digest-key').update(email).digest();

describe('First Administrator bootstrap unit of work', () => {
  let context: DatabaseTestContext;
  let prisma: PrismaClient;
  let boss: PgBoss;
  const first = new Date(Date.now() + 60_000);

  const dependencies = (at: Date): AdministratorBootstrapDependencies => ({
    unitOfWork: new PrismaAdministratorBootstrapUnitOfWork({
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
  });

  const administrators = () =>
    prisma.staffMember.findMany({
      where: { role: StaffRole.ADMINISTRATOR },
      include: {
        account: { include: { authenticationTokens: true } },
        branchAssignments: true,
      },
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
  });

  afterAll(async () => {
    await prisma?.$disconnect();
    await context?.stop();
  });

  it('lets exactly one of two concurrent runs create the pending Administrator with its link, throttle event, email job, and bootstrap audit', async () => {
    const results = await Promise.allSettled([
      bootstrapFirstAdministrator(
        { email: 'emma@example.com', name: 'Emma Díaz' },
        dependencies(first),
      ),
      bootstrapFirstAdministrator(
        { email: 'otra@example.com', name: 'Otra Persona' },
        dependencies(first),
      ),
    ]);

    const fulfilled = results.filter((result) => result.status === 'fulfilled');
    const rejected = results.filter((result) => result.status === 'rejected');
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(rejected[0]?.reason).toBeInstanceOf(
      BootstrapPendingForAnotherEmailError,
    );

    const [administrator, ...others] = await administrators();
    expect(others).toEqual([]);
    const email = administrator.account!.email;
    expect(administrator).toMatchObject({
      role: StaffRole.ADMINISTRATOR,
      branchAssignments: [],
      account: {
        passwordHash: null,
        emailVerifiedAt: null,
        activatedAt: null,
        pendingExpiresAt: new Date(first.getTime() + 30 * day),
      },
    });
    expect(administrator.account!.authenticationTokens).toEqual([
      expect.objectContaining({
        purpose: AuthenticationTokenPurpose.ACTIVATION,
        expiresAt: new Date(first.getTime() + 7 * day),
        usedAt: null,
        invalidatedAt: null,
      }),
    ]);
    await expect(
      prisma.authenticationThrottleEvent.count({
        where: {
          purpose: 'ACTIVATION',
          eventKind: AuthenticationThrottleEventKind.MESSAGE_ISSUED,
          recipientDigest: new Uint8Array(digestEmail(email)),
        },
      }),
    ).resolves.toBe(1);
    const jobs = await boss.findJobs(AUTHENTICATION_EMAIL_QUEUE, {
      id: undefined,
    });
    expect(jobs.map(({ data }) => data)).toEqual([
      expect.objectContaining({
        purpose: 'activation',
        accountId: administrator.account!.id,
        authenticationTokenId:
          administrator.account!.authenticationTokens[0].id,
      }),
    ]);
    await expect(
      prisma.auditRecord.findMany({
        where: { actionCode: { startsWith: 'administrator_bootstrap.' } },
      }),
    ).resolves.toEqual([
      expect.objectContaining({
        actionCode: 'administrator_bootstrap.created',
        outcome: 'SUCCEEDED',
        actorKind: 'BOOTSTRAP',
        actorAccountId: null,
        actorRole: null,
        targetType: 'account',
        targetId: administrator.account!.id,
        occurredAt: first,
      }),
    ]);
  });

  it('reuses the pending Administrator on a rerun for the same email and replaces its activation link', async () => {
    const [pending] = await administrators();
    const later = new Date(first.getTime() + 5 * 60_000);

    const result = await bootstrapFirstAdministrator(
      { email: pending.account!.email.toUpperCase(), name: 'Ignorado' },
      dependencies(later),
    );

    expect(result).toMatchObject({
      status: 'activation_resent',
      accountId: pending.account!.id,
      staffMemberId: pending.id,
    });
    const [administrator, ...others] = await administrators();
    expect(others).toEqual([]);
    expect(administrator.name).toBe(pending.name);
    expect(administrator.account!.pendingExpiresAt).toEqual(
      new Date(later.getTime() + 30 * day),
    );
    const tokens = administrator.account!.authenticationTokens;
    expect(tokens.filter((token) => token.invalidatedAt === null)).toEqual([
      expect.objectContaining({
        expiresAt: new Date(later.getTime() + 7 * day),
      }),
    ]);
    expect(tokens).toHaveLength(2);
    await expect(
      prisma.auditRecord.count({
        where: { actionCode: 'administrator_bootstrap.activation_resent' },
      }),
    ).resolves.toBe(1);
  });

  it('refuses without changes once the Administrator is activated', async () => {
    const [pending] = await administrators();
    await prisma.account.update({
      where: { id: pending.account!.id },
      data: {
        activatedAt: first,
        emailVerifiedAt: first,
        pendingExpiresAt: null,
      },
    });
    const audits = await prisma.auditRecord.count();
    const tokens = await prisma.authenticationToken.count();

    await expect(
      bootstrapFirstAdministrator(
        { email: pending.account!.email, name: pending.name },
        dependencies(new Date(first.getTime() + 10 * 60_000)),
      ),
    ).rejects.toBeInstanceOf(AdministratorAlreadyActiveError);
    await expect(
      bootstrapFirstAdministrator(
        { email: 'nueva@example.com', name: 'Nueva' },
        dependencies(new Date(first.getTime() + 10 * 60_000)),
      ),
    ).rejects.toBeInstanceOf(AdministratorAlreadyActiveError);
    await expect(prisma.auditRecord.count()).resolves.toBe(audits);
    await expect(prisma.authenticationToken.count()).resolves.toBe(tokens);
    await expect(administrators()).resolves.toHaveLength(1);
  });
});
