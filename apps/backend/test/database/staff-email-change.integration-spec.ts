import { createHmac, randomUUID } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { PgBoss } from 'pg-boss';
import { PrismaClient } from '../../src/generated/prisma/client';
import { applyDevelopmentFixtures } from '../../src/development-fixtures/apply-development-fixtures';
import { buildDevelopmentFixtures } from '../../src/development-fixtures/development-fixtures';
import {
  AUTHENTICATION_EMAIL_QUEUE,
  type AuthenticationEmailJob,
} from '../../src/jobs/authentication-email/authentication-email-job';
import {
  cancelStaffEmailChange,
  requestStaffEmailChange,
  resendStaffEmailChange,
} from '../../src/booking/staff/staff-email-change';
import {
  StaffManagementError,
  type StaffManagementDependencies,
} from '../../src/booking/staff/staff-management';
import {
  createPrismaStaffDirectory,
  PrismaStaffManagementUnitOfWork,
} from '../../src/booking/staff/prisma-staff-management';
import type { AuthenticatedPrincipal } from '../../src/system-identity/authentication/resolve-authenticated-principal';
import { createPrismaEmailChangeGateway } from '../../src/system-identity/email-change/prisma-email-change-gateway';
import { AuthenticationLinkCipher } from '../../src/system-identity/security/authentication-link-cipher';
import { authenticationTokens } from '../../src/system-identity/security/authentication-token-service';
import {
  DatabaseTestContext,
  startDatabaseTestContext,
} from './database-test-context';

const digestEmail = (email: string): Buffer =>
  createHmac('sha256', 'test-email-digest-key').update(email).digest();

// FIX-039 on real PostgreSQL: the studio's email change for an active Staff
// Member stores IDN-008's pending change and token, queues the link and the
// notice under the recipient throttle, audits the Administrator, and the
// link completes through the same IDN-008 completion.
describe('studio email change for a Staff Member (PostgreSQL)', () => {
  let context: DatabaseTestContext;
  let prisma: PrismaClient;
  let boss: PgBoss;
  let paola: AuthenticatedPrincipal;
  let clock = new Date(Date.now() + 60_000);
  const minutes = (count: number) => {
    clock = new Date(clock.getTime() + count * 60_000);
  };
  const cipher = new AuthenticationLinkCipher(
    'local-test-key',
    Buffer.alloc(32, 7),
  );
  const fixtures = buildDevelopmentFixtures({ today: new Date() });
  const staffId = (key: string) =>
    fixtures.staffMembers.find((member) => member.email.startsWith(`${key}.`))!
      .id;

  const dependencies = (): StaffManagementDependencies => ({
    unitOfWork: new PrismaStaffManagementUnitOfWork({
      prisma,
      boss,
      digestEmail,
      linkCipher: cipher,
      tokenIssuer: authenticationTokens,
      now: () => clock,
    }),
    now: () => clock,
    newId: randomUUID,
  });

  const jobsFor = async (accountId: string) =>
    (await boss.findJobs(AUTHENTICATION_EMAIL_QUEUE))
      .map(({ data }) => data as AuthenticationEmailJob)
      .filter((job) => job.accountId === accountId);

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

  it('asks, resends, cancels, asks again, and completes from the link', async () => {
    const daniela = staffId('daniela');
    const directory = createPrismaStaffDirectory(prisma, () => clock);
    const before = await directory.read(daniela);
    const newEmail = `daniela.${randomUUID().slice(0, 8)}@example.com`;

    const asked = await requestStaffEmailChange(
      { staffMemberId: daniela, email: newEmail },
      paola,
      dependencies(),
    );

    expect(asked.email).toBe(before!.email);
    expect(asked.pendingEmail).toEqual({
      email: newEmail,
      expiresAt: new Date(clock.getTime() + 24 * 60 * 60 * 1_000),
    });
    const first = await jobsFor(asked.accountId);
    expect(first.map(({ purpose }) => purpose).sort()).toEqual([
      'email_change',
      'email_change_notice',
    ]);
    await expect(
      prisma.authenticationThrottleEvent.count({
        where: { recipientDigest: digestEmail(newEmail) },
      }),
    ).resolves.toBe(1);
    await expect(
      prisma.auditRecord.findFirst({
        where: {
          actionCode: 'staff_member.email_change_requested',
          targetId: asked.accountId,
        },
      }),
    ).resolves.toMatchObject({
      actorAccountId: paola.accountId,
      metadata: { previousEmail: before!.email, email: newEmail },
    });

    // Within the recipient lane's minute the resend waits.
    await expect(
      resendStaffEmailChange({ staffMemberId: daniela }, paola, dependencies()),
    ).rejects.toMatchObject({ code: 'email_throttled' });

    minutes(2);
    await resendStaffEmailChange(
      { staffMemberId: daniela },
      paola,
      dependencies(),
    );
    const firstToken = first[0].authenticationTokenId;
    await expect(
      prisma.authenticationToken.findUniqueOrThrow({
        where: { id: firstToken },
      }),
    ).resolves.toMatchObject({ invalidatedAt: clock });

    const cancelled = await cancelStaffEmailChange(
      { staffMemberId: daniela },
      paola,
      dependencies(),
    );
    expect(cancelled.pendingEmail).toBeNull();
    await expect(directory.read(daniela)).resolves.toMatchObject({
      pendingEmail: null,
    });

    minutes(2);
    await requestStaffEmailChange(
      { staffMemberId: daniela, email: newEmail },
      paola,
      dependencies(),
    );
    const last = (await jobsFor(asked.accountId)).at(-1)!;
    const secret = await cipher.decrypt(
      last.encryptedLinkSecret,
      last.encryptionKeyId,
    );
    const gateway = createPrismaEmailChangeGateway(prisma, {
      boss,
      digestEmail,
    });

    await expect(
      gateway.complete({
        tokenDigest: authenticationTokens.digest(secret),
        now: clock,
      }),
    ).resolves.toBe('changed');
    await expect(directory.read(daniela)).resolves.toMatchObject({
      email: newEmail,
      pendingEmail: null,
    });
  });

  it('tells the studio when another Account uses the address', async () => {
    const promise = requestStaffEmailChange(
      {
        staffMemberId: staffId('camila'),
        email: fixtures.staffMembers.find((member) =>
          member.email.startsWith('paola.'),
        )!.email,
      },
      paola,
      dependencies(),
    );

    await expect(promise).rejects.toBeInstanceOf(StaffManagementError);
    await expect(promise).rejects.toMatchObject({ code: 'email_in_use' });
  });
});
