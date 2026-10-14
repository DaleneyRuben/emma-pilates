import { randomUUID } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../src/generated/prisma/client';
import { AuthenticationSessionRevocationReason } from '../../src/generated/prisma/enums';
import { applyDevelopmentFixtures } from '../../src/development-fixtures/apply-development-fixtures';
import { buildDevelopmentFixtures } from '../../src/development-fixtures/development-fixtures';
import { createPrismaAccountDevices } from '../../src/notifications/devices/prisma-account-devices';
import { PrismaAccountSecurityGateway } from '../../src/system-identity/account-security/prisma-account-security-gateway';
import { PrismaAuthenticationGateway } from '../../src/system-identity/authentication/prisma-authentication-gateway';
import { revokeAuthenticationSessions } from '../../src/system-identity/authentication/revoke-authentication-sessions';
import {
  createStaffAccountOperations,
  type StaffAccountDependencies,
} from '../../src/system-identity/staff-accounts/staff-accounts';
import {
  DatabaseTestContext,
  startDatabaseTestContext,
} from './database-test-context';

const at = new Date('2026-09-21T12:00:00.000Z');

describe('Revoking a session deactivates its device (NOT-002)', () => {
  let context: DatabaseTestContext;
  let prisma: PrismaClient;
  const fixtures = buildDevelopmentFixtures({
    today: new Date('2026-09-21T00:00:00.000Z'),
  });

  const accountIdFor = async (email: string): Promise<string> =>
    (
      await prisma.account.findFirstOrThrow({
        where: { email, deletedAt: null },
        select: { id: true },
      })
    ).id;

  const createSession = async (accountId: string): Promise<string> => {
    const id = randomUUID();
    await prisma.authenticationSession.create({
      data: {
        id,
        accountId,
        surface: 'MOBILE',
        credentialDigest: Buffer.from(randomUUID()),
        createdAt: new Date('2026-09-01T12:00:00.000Z'),
        lastMeaningfulActivityAt: new Date('2026-09-01T12:00:00.000Z'),
        idleExpiresAt: new Date('2026-12-01T12:00:00.000Z'),
        absoluteExpiresAt: new Date('2026-12-01T12:00:00.000Z'),
      },
    });
    return id;
  };

  // Signs in on a fresh installation and registers it for push.
  const signInOnDevice = async (accountId: string, sessionId?: string) => {
    const authenticationSessionId =
      sessionId ?? (await createSession(accountId));
    await createPrismaAccountDevices(prisma, () => at).registerCurrentDevice({
      accountId,
      authenticationSessionId,
      installationId: randomUUID(),
      expoPushToken: `ExponentPushToken[${randomUUID()}]`,
      platform: 'android',
    });
    const { accountDeviceId } =
      await prisma.authenticationSession.findUniqueOrThrow({
        where: { id: authenticationSessionId },
      });
    return { sessionId: authenticationSessionId, deviceId: accountDeviceId! };
  };

  const device = (id: string) =>
    prisma.accountDevice.findUniqueOrThrow({ where: { id } });

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

  it('deactivates the device of each revoked session with the matching reason', async () => {
    const accountId = await accountIdFor('lucia@example.com');
    const loggedOut = await signInOnDevice(accountId);
    const disabled = await signInOnDevice(accountId);

    await prisma.$transaction(async (transaction) => {
      await revokeAuthenticationSessions(
        transaction,
        { id: loggedOut.sessionId },
        {
          revokedAt: at,
          reason: AuthenticationSessionRevocationReason.PASSWORD_CHANGED,
        },
      );
      await revokeAuthenticationSessions(
        transaction,
        { id: disabled.sessionId },
        {
          revokedAt: at,
          reason: AuthenticationSessionRevocationReason.ACCOUNT_DISABLED,
        },
      );
    });

    await expect(device(loggedOut.deviceId)).resolves.toMatchObject({
      deactivatedAt: at,
      deactivationReason: 'LOGOUT',
      expoPushToken: null,
    });
    await expect(device(disabled.deviceId)).resolves.toMatchObject({
      deactivationReason: 'ACCOUNT_DISABLED',
    });
  });

  it('keeps a device that another live session of the Account still uses', async () => {
    const accountId = await accountIdFor('lucia@example.com');
    const first = await signInOnDevice(accountId);
    const second = await createSession(accountId);
    await prisma.authenticationSession.update({
      where: { id: second },
      data: { accountDeviceId: first.deviceId },
    });

    await prisma.$transaction((transaction) =>
      revokeAuthenticationSessions(
        transaction,
        { id: first.sessionId },
        { revokedAt: at, reason: AuthenticationSessionRevocationReason.LOGOUT },
      ),
    );

    await expect(device(first.deviceId)).resolves.toMatchObject({
      deactivatedAt: null,
    });
  });

  it('deactivates the device on logout', async () => {
    const accountId = await accountIdFor('valeria@example.com');
    const signedIn = await signInOnDevice(accountId);

    await new PrismaAuthenticationGateway(prisma).revokeSession({
      authenticationSessionId: signedIn.sessionId,
      revokedAt: at,
      reason: 'logout',
    });

    await expect(device(signedIn.deviceId)).resolves.toMatchObject({
      deactivationReason: 'LOGOUT',
    });
  });

  it('keeps the changing device and deactivates the others on a password change', async () => {
    const accountId = await accountIdFor('isabel@example.com');
    const current = await signInOnDevice(accountId);
    const other = await signInOnDevice(accountId);

    await new PrismaAccountSecurityGateway(prisma).completePasswordChange({
      accountId,
      authenticationSessionId: current.sessionId,
      passwordHash: 'changed-password-hash',
      changedAt: at,
      auditRecordId: randomUUID(),
    });

    await expect(device(current.deviceId)).resolves.toMatchObject({
      deactivatedAt: null,
    });
    await expect(device(other.deviceId)).resolves.toMatchObject({
      deactivationReason: 'LOGOUT',
    });
  });

  it('deactivates every device of a disabled Staff Account', async () => {
    const accountId = await accountIdFor('camila.rojas@example.com');
    const signedIn = await signInOnDevice(accountId);

    await prisma.$transaction((transaction) =>
      createStaffAccountOperations(
        transaction,
        {} as StaffAccountDependencies,
      ).disableAccount({ accountId, now: at }),
    );

    await expect(device(signedIn.deviceId)).resolves.toMatchObject({
      deactivationReason: 'ACCOUNT_DISABLED',
    });
  });
});
