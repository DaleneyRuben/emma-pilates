import { createHmac, randomUUID } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../src/generated/prisma/client';
import { login } from '../../src/system-identity/authentication/login';
import { PrismaAuthenticationGateway } from '../../src/system-identity/authentication/prisma-authentication-gateway';
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
    const command = {
      email,
      password: 'incorrect password',
      clientIdentifier: 'test-installation',
      networkAddress: '127.0.0.1',
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
        normalizedEmail: string;
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
        `login-lane:${email}\0client:test-installation\0network:127.0.0.1`,
      ),
      clientDigest: digestSignal('client:test-installation'),
      networkDigest: digestSignal('network:127.0.0.1'),
      normalizedEmail: email,
      now: new Date(successfulAt.getTime() + 1_000),
    };

    await expect(gateway.readThrottleEvents(signals)).resolves.toEqual({
      loginLaneFailures: [],
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
});
