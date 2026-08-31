import type { PrismaClient } from '../../generated/prisma/client';
import type { AccountCredentials } from './authenticate-credentials';
import type { NewMobileAuthenticationSession } from './create-mobile-authentication-session';

type ThrottleDigests = {
  loginLaneDigest: Uint8Array;
  clientDigest: Uint8Array | null;
  networkDigest: Uint8Array;
};

export class PrismaAuthenticationGateway {
  constructor(private readonly prisma: PrismaClient) {}

  findAccountByEmail(_email: string): Promise<AccountCredentials | null> {
    throw new Error('Not implemented');
  }

  readThrottleEvents(
    _input: ThrottleDigests & { normalizedEmail: string; now: Date },
  ): Promise<{
    loginLaneFailures: Date[];
    clientFailures: Date[];
    networkFailures: Date[];
  }> {
    throw new Error('Not implemented');
  }

  recordFailedCredentialCheck(
    _input: ThrottleDigests & { occurredAt: Date; expiresAt: Date },
  ): Promise<void> {
    throw new Error('Not implemented');
  }

  completeLogin(_input: {
    loginLaneDigest: Uint8Array;
    session: NewMobileAuthenticationSession;
  }): Promise<void> {
    throw new Error('Not implemented');
  }
}
