import type { PrismaClient } from '../../generated/prisma/client';
import { AuthenticationTokenPurpose } from '../../generated/prisma/enums';
import { toPrismaBytes } from '../../database/prisma-bytes';
import { authenticationTokens } from '../security/authentication-token-service';

export type PendingRegistrationStatus = 'pending' | 'verified' | 'expired';

// Walkthrough n.º 4 (C01c2): the phone that registered holds the
// continuation, so it may learn whether that registration's email was
// confirmed meanwhile, elsewhere. Nothing is written; an unknown, used up, or
// lapsed continuation is only «expired», as resend and cancel answer.
export const readPendingRegistrationStatus = async (
  prisma: Pick<PrismaClient, 'authenticationToken'>,
  input: { registrationContinuation: string; now: Date },
): Promise<PendingRegistrationStatus> => {
  const continuation = await prisma.authenticationToken.findUnique({
    where: {
      tokenDigest: toPrismaBytes(
        authenticationTokens.digest(input.registrationContinuation),
      ),
    },
    select: {
      purpose: true,
      invalidatedAt: true,
      expiresAt: true,
      account: {
        select: {
          clientId: true,
          deletedAt: true,
          emailVerifiedAt: true,
          pendingExpiresAt: true,
        },
      },
    },
  });

  if (
    continuation === null ||
    continuation.purpose !==
      AuthenticationTokenPurpose.REGISTRATION_CONTINUATION ||
    continuation.invalidatedAt !== null ||
    continuation.account.clientId === null ||
    continuation.account.deletedAt !== null
  ) {
    return 'expired';
  }
  if (continuation.account.emailVerifiedAt !== null) return 'verified';
  if (
    continuation.expiresAt <= input.now ||
    continuation.account.pendingExpiresAt === null ||
    continuation.account.pendingExpiresAt <= input.now
  ) {
    return 'expired';
  }
  return 'pending';
};
