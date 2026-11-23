import { randomUUID } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../src/generated/prisma/client';
import { applyDevelopmentFixtures } from '../../src/development-fixtures/apply-development-fixtures';
import { buildDevelopmentFixtures } from '../../src/development-fixtures/development-fixtures';
import { createAccountClosureOperations } from '../../src/system-identity/account-closure/account-closure';
import { PrismaAccountSecurityGateway } from '../../src/system-identity/account-security/prisma-account-security-gateway';
import { newAuthenticationSession } from '../../src/system-identity/authentication/create-authentication-session';
import type { NewBiometricKey } from '../../src/system-identity/biometric-keys/biometric-keys';
import { createPrismaBiometricKeyGateway } from '../../src/system-identity/biometric-keys/prisma-biometric-key-gateway';
import {
  createStaffAccountOperations,
  type StaffAccountDependencies,
} from '../../src/system-identity/staff-accounts/staff-accounts';
import {
  DatabaseTestContext,
  startDatabaseTestContext,
} from './database-test-context';

const at = new Date('2026-11-23T12:00:00.000Z');
const later = new Date('2027-02-21T12:00:00.000Z');

describe('Biometric keys (MOB-006)', () => {
  let context: DatabaseTestContext;
  let prisma: PrismaClient;
  const fixtures = buildDevelopmentFixtures({
    today: new Date('2026-11-23T00:00:00.000Z'),
  });
  const actor = (accountId: string) => ({
    accountId,
    role: null,
    impersonationId: null,
  });

  const accountIdFor = async (email: string): Promise<string> =>
    (
      await prisma.account.findFirstOrThrow({
        where: { email, deletedAt: null },
        select: { id: true },
      })
    ).id;
  const newKey = (
    accountId: string,
    installationIdDigest: Buffer,
  ): NewBiometricKey => ({
    id: randomUUID(),
    accountId,
    installationIdDigest,
    keyDigest: Buffer.from(randomUUID()),
    unlockSecretDigest: Buffer.from(`unlock-${accountId}`),
    issuedAt: at,
    expiresAt: later,
  });
  const issued = async (accountId: string, installation = randomUUID()) => {
    const key = newKey(accountId, Buffer.from(installation));
    await createPrismaBiometricKeyGateway(prisma).issue({
      key,
      actor: actor(accountId),
      auditRecordId: randomUUID(),
    });
    return key;
  };
  const row = (id: string) =>
    prisma.biometricKey.findUniqueOrThrow({ where: { id } });
  const createSession = async (accountId: string): Promise<string> => {
    const id = randomUUID();
    await prisma.authenticationSession.create({
      data: {
        id,
        accountId,
        surface: 'MOBILE',
        credentialDigest: Buffer.from(randomUUID()),
        createdAt: at,
        lastMeaningfulActivityAt: at,
        idleExpiresAt: later,
        absoluteExpiresAt: later,
      },
    });
    return id;
  };

  beforeAll(async () => {
    context = await startDatabaseTestContext();
    prisma = new PrismaClient({ adapter: new PrismaPg(context.pool) });
    await applyDevelopmentFixtures(prisma, {
      fixtures,
      passwordHash: 'not-a-real-hash',
    });
  });

  afterAll(async () => {
    await prisma?.$disconnect();
    await context?.stop();
  });

  it('stores a key with its audit record and replaces the installation’s previous one', async () => {
    const accountId = await accountIdFor('lucia@example.com');
    const installation = randomUUID();
    const first = await issued(accountId, installation);
    const second = await issued(accountId, installation);

    await expect(row(first.id)).resolves.toMatchObject({
      revokedAt: at,
      revocationReason: 'REPLACED',
    });
    await expect(row(second.id)).resolves.toMatchObject({
      accountId,
      issuedAt: at,
      expiresAt: later,
      revokedAt: null,
    });
    await expect(
      prisma.auditRecord.count({
        where: {
          actionCode: 'account.biometric_key_issued',
          actorAccountId: accountId,
          targetId: accountId,
        },
      }),
    ).resolves.toBe(2);
  });

  it('finds a key with whether its Account may still sign in', async () => {
    const lucia = await accountIdFor('lucia@example.com');
    const key = await issued(lucia);
    const gateway = createPrismaBiometricKeyGateway(prisma);

    await expect(gateway.findByKeyDigest(key.keyDigest)).resolves.toEqual({
      id: key.id,
      accountId: lucia,
      installationIdDigest: Buffer.from(key.installationIdDigest),
      unlockSecretDigest: Buffer.from(key.unlockSecretDigest),
      expiresAt: later,
      revokedAt: null,
      revocationReason: null,
      accountCanSignIn: true,
    });
    await expect(
      gateway.findByKeyDigest(Buffer.from(randomUUID())),
    ).resolves.toBeNull();

    const camila = await accountIdFor('camila.rojas@example.com');
    const staffKey = await issued(camila);
    await prisma.account.update({
      where: { id: camila },
      data: { disabledAt: at },
    });
    await expect(
      gateway.findByKeyDigest(staffKey.keyDigest),
    ).resolves.toMatchObject({ accountCanSignIn: false });
    await prisma.account.update({
      where: { id: camila },
      data: { disabledAt: null },
    });
  });

  it('rotates a key into a new session exactly once', async () => {
    const accountId = await accountIdFor('valeria@example.com');
    const previous = await issued(accountId);
    const gateway = createPrismaBiometricKeyGateway(prisma);
    const rotate = () => {
      const key = newKey(accountId, Buffer.from(previous.installationIdDigest));
      const session = newAuthenticationSession(
        {
          id: randomUUID(),
          accountId,
          surface: 'mobile',
          credentialDigest: Buffer.from(randomUUID()),
        },
        at,
      );
      return {
        key,
        session,
        result: gateway.rotate({ previousKeyId: previous.id, key, session }),
      };
    };

    const first = rotate();
    await expect(first.result).resolves.toBe(true);
    await expect(row(previous.id)).resolves.toMatchObject({
      revokedAt: at,
      revocationReason: 'ROTATED',
    });
    await expect(row(first.key.id)).resolves.toMatchObject({ revokedAt: null });
    await expect(
      prisma.authenticationSession.findUniqueOrThrow({
        where: { id: first.session.id },
      }),
    ).resolves.toMatchObject({ accountId, surface: 'MOBILE', revokedAt: null });

    const second = rotate();
    await expect(second.result).resolves.toBe(false);
    await expect(
      prisma.authenticationSession.findUnique({
        where: { id: second.session.id },
      }),
    ).resolves.toBeNull();
    await expect(
      prisma.biometricKey.findUnique({ where: { id: second.key.id } }),
    ).resolves.toBeNull();
  });

  it('revokes an installation’s keys with an audit record that says why', async () => {
    const accountId = await accountIdFor('mariana@example.com');
    const key = await issued(accountId);
    const elsewhere = await issued(accountId);
    const auditRecordId = randomUUID();

    await createPrismaBiometricKeyGateway(prisma).revokeInstallation({
      accountId,
      installationIdDigest: Buffer.from(key.installationIdDigest),
      revokedAt: at,
      reason: 'reuse_detected',
      auditRecordId,
    });

    await expect(row(key.id)).resolves.toMatchObject({
      revokedAt: at,
      revocationReason: 'REUSE_DETECTED',
    });
    await expect(row(elsewhere.id)).resolves.toMatchObject({ revokedAt: null });
    await expect(
      prisma.auditRecord.findUniqueOrThrow({ where: { id: auditRecordId } }),
    ).resolves.toMatchObject({
      actionCode: 'account.biometric_key_revoked',
      actorKind: 'ACCOUNT',
      actorAccountId: accountId,
      targetId: accountId,
      metadata: { reason: 'reuse_detected' },
    });
  });

  it('revokes every key of the Account when its password changes, this phone’s too', async () => {
    const accountId = await accountIdFor('isabel@example.com');
    const current = await issued(accountId);
    const other = await issued(accountId);

    await new PrismaAccountSecurityGateway(prisma).completePasswordChange({
      accountId,
      authenticationSessionId: await createSession(accountId),
      passwordHash: 'changed-password-hash',
      changedAt: at,
      auditRecordId: randomUUID(),
    });

    for (const key of [current, other]) {
      await expect(row(key.id)).resolves.toMatchObject({
        revokedAt: at,
        revocationReason: 'PASSWORD_CHANGED',
      });
    }
  });

  it('revokes every key of the Account when its password is recovered', async () => {
    const accountId = await accountIdFor('sofia@example.com');
    const key = await issued(accountId);
    const tokenDigest = Buffer.from(randomUUID());
    await prisma.authenticationToken.create({
      data: {
        accountId,
        purpose: 'PASSWORD_RECOVERY',
        tokenDigest,
        issuedAt: new Date('2026-11-23T11:45:00.000Z'),
        expiresAt: new Date('2026-11-23T12:15:00.000Z'),
      },
    });

    await new PrismaAccountSecurityGateway(prisma).completeRecovery({
      tokenDigest,
      passwordHash: 'recovered-password-hash',
      completedAt: at,
      authenticationSession: {
        id: randomUUID(),
        surface: 'mobile',
        credentialDigest: Buffer.from(randomUUID()),
        createdAt: at,
        lastMeaningfulActivityAt: at,
        idleExpiresAt: later,
        absoluteExpiresAt: later,
      },
      sessionEligibility: 'any',
      auditRecordId: randomUUID(),
    });

    await expect(row(key.id)).resolves.toMatchObject({
      revokedAt: at,
      revocationReason: 'PASSWORD_RECOVERED',
    });
  });

  it('revokes every key of a deactivated Staff Member', async () => {
    const accountId = await accountIdFor('emma.vargas@example.com');
    const key = await issued(accountId);

    await prisma.$transaction((transaction) =>
      createStaffAccountOperations(
        transaction,
        {} as StaffAccountDependencies,
      ).disableAccount({ accountId, now: at }),
    );

    await expect(row(key.id)).resolves.toMatchObject({
      revokedAt: at,
      revocationReason: 'ACCOUNT_DISABLED',
    });
  });

  it('revokes every key of a closed Account', async () => {
    const accountId = await accountIdFor('lucia@example.com');
    const key = await issued(accountId);

    await prisma.$transaction((transaction) =>
      createAccountClosureOperations(transaction).closeAccount({
        accountId,
        occurredAt: at,
      }),
    );

    await expect(row(key.id)).resolves.toMatchObject({
      revokedAt: at,
      revocationReason: 'ACCOUNT_CLOSED',
    });
  });
});
