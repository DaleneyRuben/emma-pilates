import { createHmac, randomUUID } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../src/generated/prisma/client';
import { login } from '../../src/system-identity/authentication/login';
import { logout } from '../../src/system-identity/authentication/logout';
import { PrismaAuthenticationGateway } from '../../src/system-identity/authentication/prisma-authentication-gateway';
import {
  AuthenticationRequiredError,
  resolveAuthenticatedPrincipal,
} from '../../src/system-identity/authentication/resolve-authenticated-principal';
import {
  hashPassword,
  verifyPassword,
} from '../../src/system-identity/security/argon2-password-hasher';
import { authenticationTokens } from '../../src/system-identity/security/authentication-token-service';
import {
  DatabaseTestContext,
  startDatabaseTestContext,
} from './database-test-context';

describe('mobile Login persistence', () => {
  let context: DatabaseTestContext;
  let prisma: PrismaClient;

  beforeAll(async () => {
    context = await startDatabaseTestContext();
    prisma = new PrismaClient({ adapter: new PrismaPg(context.pool) });
  });

  afterAll(async () => {
    await prisma?.$disconnect();
    await context?.stop();
  });

  it('keeps broader failure budgets when a successful Login clears its matching lane', async () => {
    const clientId = randomUUID();
    const accountId = randomUUID();
    const email = `${accountId}@example.com`;
    await prisma.client.create({
      data: {
        id: clientId,
        name: 'Login Client',
        referralCode: `ref-${clientId}`,
      },
    });
    await prisma.account.create({
      data: {
        id: accountId,
        clientId,
        email,
        passwordHash: await hashPassword('correct password'),
        emailVerifiedAt: new Date('2026-08-30T12:00:00.000Z'),
        activatedAt: new Date('2026-08-30T12:00:00.000Z'),
      },
    });
    const gateway = new PrismaAuthenticationGateway(prisma);
    const digestSignal = (value: string): Buffer =>
      createHmac('sha256', 'login-throttle-test-key').update(value).digest();
    const clientIdentifier = randomUUID();
    const networkAddress = randomUUID();
    const command = {
      email,
      password: 'incorrect password',
      clientIdentifier,
      networkAddress,
    };
    const failedAt = new Date('2026-08-31T12:00:00.000Z');
    const dependencies = (now: Date) => ({
      findAccountByEmail: (normalizedEmail: string) =>
        gateway.findAccountByEmail(normalizedEmail),
      verifyPassword,
      dummyPasswordHash:
        '$argon2id$v=19$m=65536,t=3,p=4$AAAAAAAAAAAAAAAAAAAAAA$uG8qNWV7uYB+z5RZP19GhgQz9mZ4kn1M8v2vB+6M0hI',
      digestSignal,
      readThrottleEvents: (input: {
        loginLaneDigest: Uint8Array;
        clientDigest: Uint8Array | null;
        networkDigest: Uint8Array;
        now: Date;
      }) => gateway.readThrottleEvents(input),
      recordFailedCredentialCheck: (
        input: Parameters<
          PrismaAuthenticationGateway['recordFailedCredentialCheck']
        >[0],
      ) => gateway.recordFailedCredentialCheck(input),
      completeLogin: (
        input: Parameters<PrismaAuthenticationGateway['completeLogin']>[0],
      ) => gateway.completeLogin(input),
      issueCredential: authenticationTokens.issue,
      newId: randomUUID,
      now: () => now,
    });

    await expect(login(command, dependencies(failedAt))).rejects.toThrow();

    const otherClientIdentifier = randomUUID();
    const otherNetworkAddress = randomUUID();
    const otherLaneDigest = digestSignal(
      `login-lane:${email}\0client:${otherClientIdentifier}\0network:${otherNetworkAddress}`,
    );
    await gateway.recordFailedCredentialCheck({
      loginLaneDigest: otherLaneDigest,
      clientDigest: digestSignal(`client:${otherClientIdentifier}`),
      networkDigest: digestSignal(`network:${otherNetworkAddress}`),
      occurredAt: failedAt,
      expiresAt: new Date(failedAt.getTime() + 60 * 60 * 1_000),
    });

    const successfulAt = new Date(failedAt.getTime() + 1_000);
    const result = await login(
      { ...command, password: 'correct password' },
      dependencies(successfulAt),
    );
    const session = await prisma.authenticationSession.findUniqueOrThrow({
      where: {
        credentialDigest: Uint8Array.from(
          authenticationTokens.digest(result.credential),
        ),
      },
    });
    const signals = {
      loginLaneDigest: digestSignal(
        `login-lane:${email}\0client:${clientIdentifier}\0network:${networkAddress}`,
      ),
      clientDigest: digestSignal(`client:${clientIdentifier}`),
      networkDigest: digestSignal(`network:${networkAddress}`),
      now: new Date(successfulAt.getTime() + 1_000),
    };

    await expect(gateway.readThrottleEvents(signals)).resolves.toEqual({
      loginLaneFailures: [],
      clientFailures: [failedAt],
      networkFailures: [failedAt],
    });
    await expect(
      gateway.readThrottleEvents({
        loginLaneDigest: otherLaneDigest,
        clientDigest: digestSignal(`client:${otherClientIdentifier}`),
        networkDigest: digestSignal(`network:${otherNetworkAddress}`),
        now: new Date(successfulAt.getTime() + 1_000),
      }),
    ).resolves.toEqual({
      loginLaneFailures: [failedAt],
      clientFailures: [failedAt],
      networkFailures: [failedAt],
    });
    expect(session).toMatchObject({
      accountId,
      surface: 'MOBILE',
      createdAt: successfulAt,
      revokedAt: null,
    });
  });

  it('resolves current identity, records meaningful activity, and revokes Logout immediately', async () => {
    const clientId = randomUUID();
    const accountId = randomUUID();
    const authenticationSessionId = randomUUID();
    const credential = authenticationTokens.issue();
    const createdAt = new Date('2026-08-31T12:00:00.000Z');
    const activityAt = new Date('2026-09-01T12:00:00.000Z');
    await prisma.client.create({
      data: {
        id: clientId,
        name: 'Authenticated Client',
        referralCode: `ref-${clientId}`,
      },
    });
    await prisma.account.create({
      data: {
        id: accountId,
        clientId,
        email: `${accountId}@example.com`,
        passwordHash: await hashPassword('correct password'),
        emailVerifiedAt: createdAt,
        activatedAt: createdAt,
        authenticationSessions: {
          create: {
            id: authenticationSessionId,
            surface: 'MOBILE',
            credentialDigest: Uint8Array.from(credential.digest),
            createdAt,
            lastMeaningfulActivityAt: createdAt,
            idleExpiresAt: new Date('2026-09-30T12:00:00.000Z'),
            absoluteExpiresAt: new Date('2026-11-29T12:00:00.000Z'),
          },
        },
      },
    });
    const gateway = new PrismaAuthenticationGateway(prisma);
    const resolverDependencies = (now: Date) => ({
      digestCredential: authenticationTokens.digest,
      findSessionByCredentialDigest: (digest: Uint8Array) =>
        gateway.findSessionByCredentialDigest(digest),
      recordMeaningfulActivity: (
        input: Parameters<
          PrismaAuthenticationGateway['recordMeaningfulActivity']
        >[0],
      ) => gateway.recordMeaningfulActivity(input),
      now: () => now,
    });

    await expect(
      resolveAuthenticatedPrincipal(
        credential.secret,
        true,
        resolverDependencies(activityAt),
      ),
    ).resolves.toEqual({
      accountId,
      authenticationSessionId,
      identity: { kind: 'client', clientId },
    });
    await expect(
      prisma.authenticationSession.findUniqueOrThrow({
        where: { id: authenticationSessionId },
      }),
    ).resolves.toMatchObject({
      lastMeaningfulActivityAt: activityAt,
      idleExpiresAt: new Date('2026-10-01T12:00:00.000Z'),
    });

    const loggedOutAt = new Date('2026-09-01T12:05:00.000Z');
    await logout(authenticationSessionId, {
      now: () => loggedOutAt,
      revokeSession: (input) => gateway.revokeSession(input),
    });

    await expect(
      resolveAuthenticatedPrincipal(
        credential.secret,
        false,
        resolverDependencies(loggedOutAt),
      ),
    ).rejects.toBeInstanceOf(AuthenticationRequiredError);
    await expect(
      prisma.authenticationSession.findUniqueOrThrow({
        where: { id: authenticationSessionId },
      }),
    ).resolves.toMatchObject({
      revokedAt: loggedOutAt,
      revocationReason: 'LOGOUT',
    });
  });
});
