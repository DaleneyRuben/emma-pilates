import type { PrismaClient } from '../../generated/prisma/client';
import { toPrismaBytes } from '../../database/prisma-bytes';
import {
  AuthenticationSessionRevocationReason,
  AuthenticationSessionSurface,
  AuthenticationThrottleEventKind,
  AuthenticationThrottlePurpose,
} from '../../generated/prisma/enums';
import type { AccountCredentials } from './authenticate-credentials';
import type { NewMobileAuthenticationSession } from './create-mobile-authentication-session';
import {
  AuthenticationRequiredError,
  type AuthenticationSessionPrincipalRecord,
} from './resolve-authenticated-principal';

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

  async readThrottleEvents(input: ThrottleDigests & { now: Date }): Promise<{
    loginLaneFailures: Date[];
    clientFailures: Date[];
    networkFailures: Date[];
  }> {
    const laneStartedAt = new Date(input.now.getTime() - 60 * 60 * 1_000);
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
    const credentialDigest = toPrismaBytes(input.session.credentialDigest);

    await this.prisma.$transaction([
      this.prisma.authenticationThrottleEvent.updateMany({
        where: {
          purpose: AuthenticationThrottlePurpose.LOGIN,
          eventKind: AuthenticationThrottleEventKind.FAILED_CREDENTIAL_CHECK,
          loginLaneDigest: toPrismaBytes(input.loginLaneDigest),
        },
        data: { loginLaneDigest: credentialDigest },
      }),
      this.prisma.authenticationSession.create({
        data: {
          id: input.session.id,
          accountId: input.session.accountId,
          surface: AuthenticationSessionSurface.MOBILE,
          credentialDigest,
          createdAt: input.session.createdAt,
          lastMeaningfulActivityAt: input.session.lastMeaningfulActivityAt,
          idleExpiresAt: input.session.idleExpiresAt,
          absoluteExpiresAt: input.session.absoluteExpiresAt,
        },
      }),
    ]);
  }

  findSessionByCredentialDigest(
    digest: Uint8Array,
  ): Promise<AuthenticationSessionPrincipalRecord | null> {
    return this.prisma.authenticationSession
      .findUnique({
        where: { credentialDigest: toPrismaBytes(digest) },
        select: {
          id: true,
          accountId: true,
          createdAt: true,
          idleExpiresAt: true,
          absoluteExpiresAt: true,
          revokedAt: true,
          account: {
            select: {
              disabledAt: true,
              clientId: true,
              staffMember: {
                select: {
                  id: true,
                  role: true,
                  branchAssignments: { select: { branchId: true } },
                },
              },
            },
          },
        },
      })
      .then((session) =>
        session === null
          ? null
          : {
              id: session.id,
              accountId: session.accountId,
              createdAt: session.createdAt,
              idleExpiresAt: session.idleExpiresAt,
              absoluteExpiresAt: session.absoluteExpiresAt,
              revokedAt: session.revokedAt,
              accountDisabledAt: session.account.disabledAt,
              clientId: session.account.clientId,
              staffMember:
                session.account.staffMember === null
                  ? null
                  : {
                      id: session.account.staffMember.id,
                      role: session.account.staffMember.role,
                      branchIds:
                        session.account.staffMember.branchAssignments.map(
                          ({ branchId }) => branchId,
                        ),
                    },
            },
      );
  }

  async recordMeaningfulActivity(input: {
    authenticationSessionId: string;
    activityAt: Date;
    idleExpiresAt: Date;
  }): Promise<void> {
    const result = await this.prisma.authenticationSession.updateMany({
      where: {
        id: input.authenticationSessionId,
        revokedAt: null,
        idleExpiresAt: { gt: input.activityAt },
        absoluteExpiresAt: { gt: input.activityAt },
        account: { disabledAt: null },
      },
      data: {
        lastMeaningfulActivityAt: input.activityAt,
        idleExpiresAt: input.idleExpiresAt,
      },
    });

    if (result.count !== 1) {
      throw new AuthenticationRequiredError();
    }
  }

  async revokeSession(input: {
    authenticationSessionId: string;
    revokedAt: Date;
    reason: 'logout';
  }): Promise<void> {
    await this.prisma.authenticationSession.updateMany({
      where: { id: input.authenticationSessionId, revokedAt: null },
      data: {
        revokedAt: input.revokedAt,
        revocationReason: AuthenticationSessionRevocationReason.LOGOUT,
      },
    });
  }
}
