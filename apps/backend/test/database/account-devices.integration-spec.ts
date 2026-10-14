import { createHash, randomUUID } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../src/generated/prisma/client';
import { applyDevelopmentFixtures } from '../../src/development-fixtures/apply-development-fixtures';
import { buildDevelopmentFixtures } from '../../src/development-fixtures/development-fixtures';
import { createPrismaAccountDevices } from '../../src/notifications/devices/prisma-account-devices';
import {
  DatabaseTestContext,
  startDatabaseTestContext,
} from './database-test-context';

const today = new Date('2026-09-21T00:00:00.000Z');

describe('Account devices (NOT-002)', () => {
  let context: DatabaseTestContext;
  let prisma: PrismaClient;
  let lucia: string;
  let valeria: string;
  let clock: Date;
  const fixtures = buildDevelopmentFixtures({ today });

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

  const devices = () => createPrismaAccountDevices(prisma, () => clock);
  const token = (label: string) => `ExponentPushToken[${label}]`;
  const digest = (installationId: string) =>
    createHash('sha256').update(installationId).digest();
  const rowsFor = (installationId: string) =>
    prisma.accountDevice.findMany({
      where: { installationIdDigest: digest(installationId) },
      orderBy: { registeredAt: 'asc' },
    });

  beforeAll(async () => {
    context = await startDatabaseTestContext();
    prisma = new PrismaClient({ adapter: new PrismaPg(context.pool) });
    await applyDevelopmentFixtures(prisma, {
      fixtures,
      passwordHash: 'not-a-real-hash',
    });
    lucia = await accountIdFor('lucia@example.com');
    valeria = await accountIdFor('valeria@example.com');
  });

  beforeEach(() => {
    clock = new Date('2026-09-21T12:00:00.000Z');
  });

  afterAll(async () => {
    await prisma?.$disconnect();
    await context?.stop();
  });

  it('registers a device by the digest of its installation id and links the session', async () => {
    const installationId = randomUUID();
    const sessionId = await createSession(lucia);

    await devices().registerCurrentDevice({
      accountId: lucia,
      authenticationSessionId: sessionId,
      installationId,
      expoPushToken: token('first'),
      platform: 'ios',
    });

    const [device] = await rowsFor(installationId);
    expect(device).toMatchObject({
      accountId: lucia,
      expoPushToken: token('first'),
      platform: 'IOS',
      registeredAt: clock,
      deactivatedAt: null,
    });
    expect(Buffer.from(device.installationIdDigest)).not.toEqual(
      Buffer.from(installationId),
    );
    await expect(
      prisma.authenticationSession.findUniqueOrThrow({
        where: { id: sessionId },
      }),
    ).resolves.toMatchObject({ accountDeviceId: device.id });
  });

  it('updates the same row when the Account registers again', async () => {
    const installationId = randomUUID();
    const sessionId = await createSession(lucia);
    const register = (expoPushToken: string) =>
      devices().registerCurrentDevice({
        accountId: lucia,
        authenticationSessionId: sessionId,
        installationId,
        expoPushToken,
        platform: 'android',
      });

    await register(token('same-a'));
    clock = new Date('2026-09-21T13:00:00.000Z');
    await register(token('same-a'));
    let [device] = await rowsFor(installationId);
    expect(device).toMatchObject({
      tokenUpdatedAt: new Date('2026-09-21T12:00:00.000Z'),
      lastSeenAt: clock,
    });

    clock = new Date('2026-09-21T14:00:00.000Z');
    await register(token('same-b'));
    const rows = await rowsFor(installationId);
    expect(rows).toHaveLength(1);
    [device] = rows;
    expect(device).toMatchObject({
      expoPushToken: token('same-b'),
      tokenUpdatedAt: clock,
      lastSeenAt: clock,
    });
  });

  it('moves a shared device to the Account that signs in on it', async () => {
    const installationId = randomUUID();

    await devices().registerCurrentDevice({
      accountId: lucia,
      authenticationSessionId: await createSession(lucia),
      installationId,
      expoPushToken: token('shared'),
      platform: 'ios',
    });
    clock = new Date('2026-09-21T15:00:00.000Z');
    await devices().registerCurrentDevice({
      accountId: valeria,
      authenticationSessionId: await createSession(valeria),
      installationId,
      expoPushToken: token('shared'),
      platform: 'ios',
    });

    const [previous, current] = await rowsFor(installationId);
    expect(previous).toMatchObject({
      accountId: lucia,
      deactivatedAt: clock,
      deactivationReason: 'ACCOUNT_CHANGED',
      expoPushToken: null,
    });
    expect(current).toMatchObject({
      accountId: valeria,
      deactivatedAt: null,
      expoPushToken: token('shared'),
    });
  });

  it('deactivates the other row when a token moves to a new installation', async () => {
    const before = randomUUID();
    const after = randomUUID();
    const sessionId = await createSession(lucia);

    await devices().registerCurrentDevice({
      accountId: lucia,
      authenticationSessionId: sessionId,
      installationId: before,
      expoPushToken: token('moved'),
      platform: 'android',
    });
    await devices().registerCurrentDevice({
      accountId: lucia,
      authenticationSessionId: sessionId,
      installationId: after,
      expoPushToken: token('moved'),
      platform: 'android',
    });

    await expect(rowsFor(before)).resolves.toEqual([
      expect.objectContaining({
        deactivationReason: 'TOKEN_REPLACED',
        expoPushToken: null,
      }),
    ]);
    await expect(rowsFor(after)).resolves.toEqual([
      expect.objectContaining({
        deactivatedAt: null,
        expoPushToken: token('moved'),
      }),
    ]);
  });

  it('deactivates only the Account’s own device when permission is revoked', async () => {
    const installationId = randomUUID();
    const sessionId = await createSession(lucia);
    await devices().registerCurrentDevice({
      accountId: lucia,
      authenticationSessionId: sessionId,
      installationId,
      expoPushToken: token('revoked'),
      platform: 'ios',
    });

    await devices().deactivateCurrentDevice({
      accountId: valeria,
      installationId,
    });
    await expect(rowsFor(installationId)).resolves.toEqual([
      expect.objectContaining({ deactivatedAt: null }),
    ]);

    await devices().deactivateCurrentDevice({
      accountId: lucia,
      installationId,
    });
    await expect(rowsFor(installationId)).resolves.toEqual([
      expect.objectContaining({
        deactivatedAt: clock,
        deactivationReason: 'PERMISSION_REVOKED',
        expoPushToken: null,
      }),
    ]);

    await devices().registerCurrentDevice({
      accountId: lucia,
      authenticationSessionId: sessionId,
      installationId,
      expoPushToken: token('revoked'),
      platform: 'ios',
    });
    const rows = await rowsFor(installationId);
    expect(rows).toHaveLength(2);
    expect(rows[1]).toMatchObject({ deactivatedAt: null });
  });

  it('keeps one active row when the same installation registers twice at once', async () => {
    const installationId = randomUUID();
    const sessionId = await createSession(lucia);
    const register = () =>
      devices().registerCurrentDevice({
        accountId: lucia,
        authenticationSessionId: sessionId,
        installationId,
        expoPushToken: token('race'),
        platform: 'ios',
      });

    await Promise.all([register(), register(), register()]);

    const active = (await rowsFor(installationId)).filter(
      (row) => row.deactivatedAt === null,
    );
    expect(active).toHaveLength(1);
  });
});
