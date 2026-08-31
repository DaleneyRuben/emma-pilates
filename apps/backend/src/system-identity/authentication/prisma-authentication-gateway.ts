import type { PrismaClient } from '../../generated/prisma/client';
import {
  AuthenticationSessionSurface,
  AuthenticationThrottleEventKind,
  AuthenticationThrottlePurpose,
} from '../../generated/prisma/enums';
import type { AccountCredentials } from './authenticate-credentials';
import type { NewMobileAuthenticationSession } from './create-mobile-authentication-session';
import type { AuthenticationSessionPrincipalRecord } from './resolve-authenticated-principal';

type ThrottleDigests = {
  loginLaneDigest: Uint8Array;
  clientDigest: Uint8Array | null;
  networkDigest: Uint8Array;
};

export class PrismaAuthenticationGateway {
  constructor(private readonly prisma: PrismaClient) {}

  findAccountByEmail(email: string): Promise<AccountCredentials | null> {
    return this.prisma.account.findUnique({
      where: { email },
      select: {
        id: true,
        passwordHash: true,
        emailVerifiedAt: true,
        activatedAt: true,
        disabledAt: true,
      },
    });
  }

  async readThrottleEvents(
    input: ThrottleDigests & { normalizedEmail: string; now: Date },
  ): Promise<{
    loginLaneFailures: Date[];
    clientFailures: Date[];
    networkFailures: Date[];
  }> {
    const account = await this.prisma.account.findUnique({
      where: { email: input.normalizedEmail },
      select: {
        authenticationSessions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { createdAt: true },
        },
      },
    });
    const oneHourAgo = new Date(input.now.getTime() - 60 * 60 * 1_000);
    const lastSuccessfulLoginAt = account?.authenticationSessions[0]?.createdAt;
    const laneStartedAt =
      lastSuccessfulLoginAt && lastSuccessfulLoginAt > oneHourAgo
        ? lastSuccessfulLoginAt
        : oneHourAgo;
    const eventWhere = {
      purpose: AuthenticationThrottlePurpose.LOGIN,
      eventKind: AuthenticationThrottleEventKind.FAILED_CREDENTIAL_CHECK,
      expiresAt: { gt: input.now },
    } as const;
    const [loginLaneEvents, clientEvents, networkEvents] = await Promise.all([
      this.prisma.authenticationThrottleEvent.findMany({
        where: {
          ...eventWhere,
          loginLaneDigest: toPrismaBytes(input.loginLaneDigest),
          occurredAt: { gt: laneStartedAt },
        },
        orderBy: { occurredAt: 'asc' },
        select: { occurredAt: true },
      }),
      input.clientDigest === null
        ? Promise.resolve([])
        : this.prisma.authenticationThrottleEvent.findMany({
            where: {
              ...eventWhere,
              clientDigest: toPrismaBytes(input.clientDigest),
              occurredAt: {
                gt: new Date(input.now.getTime() - 15 * 60 * 1_000),
              },
            },
            orderBy: { occurredAt: 'asc' },
            select: { occurredAt: true },
          }),
      this.prisma.authenticationThrottleEvent.findMany({
        where: {
          ...eventWhere,
          networkDigest: toPrismaBytes(input.networkDigest),
          occurredAt: {
            gt: new Date(input.now.getTime() - 15 * 60 * 1_000),
          },
        },
        orderBy: { occurredAt: 'asc' },
        select: { occurredAt: true },
      }),
    ]);

    return {
      loginLaneFailures: loginLaneEvents.map(({ occurredAt }) => occurredAt),
      clientFailures: clientEvents.map(({ occurredAt }) => occurredAt),
      networkFailures: networkEvents.map(({ occurredAt }) => occurredAt),
    };
  }

  async recordFailedCredentialCheck(
    input: ThrottleDigests & { occurredAt: Date; expiresAt: Date },
  ): Promise<void> {
    await this.prisma.authenticationThrottleEvent.create({
      data: {
        purpose: AuthenticationThrottlePurpose.LOGIN,
        eventKind: AuthenticationThrottleEventKind.FAILED_CREDENTIAL_CHECK,
        loginLaneDigest: toPrismaBytes(input.loginLaneDigest),
        clientDigest:
          input.clientDigest === null
            ? null
            : toPrismaBytes(input.clientDigest),
        networkDigest: toPrismaBytes(input.networkDigest),
        occurredAt: input.occurredAt,
        expiresAt: input.expiresAt,
      },
    });
  }

  async completeLogin(input: {
    loginLaneDigest: Uint8Array;
    session: NewMobileAuthenticationSession;
  }): Promise<void> {
    await this.prisma.authenticationSession.create({
      data: {
        id: input.session.id,
        accountId: input.session.accountId,
        surface: AuthenticationSessionSurface.MOBILE,
        credentialDigest: toPrismaBytes(input.session.credentialDigest),
        createdAt: input.session.createdAt,
        lastMeaningfulActivityAt: input.session.lastMeaningfulActivityAt,
        idleExpiresAt: input.session.idleExpiresAt,
        absoluteExpiresAt: input.session.absoluteExpiresAt,
      },
    });
  }

  findSessionByCredentialDigest(
    _digest: Uint8Array,
  ): Promise<AuthenticationSessionPrincipalRecord | null> {
    throw new Error('Not implemented');
  }

  recordMeaningfulActivity(_input: {
    authenticationSessionId: string;
    activityAt: Date;
    idleExpiresAt: Date;
  }): Promise<void> {
    throw new Error('Not implemented');
  }

  revokeSession(_input: {
    authenticationSessionId: string;
    revokedAt: Date;
    reason: 'logout';
  }): Promise<void> {
    throw new Error('Not implemented');
  }
}

const toPrismaBytes = (value: Uint8Array): Uint8Array<ArrayBuffer> => {
  const bytes = new Uint8Array(value.byteLength);
  bytes.set(value);

  return bytes;
};
