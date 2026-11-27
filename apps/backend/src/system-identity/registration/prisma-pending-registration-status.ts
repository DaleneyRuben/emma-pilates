import type { PrismaClient } from '../../generated/prisma/client';
import { AuthenticationTokenPurpose } from '../../generated/prisma/enums';
import { toPrismaBytes } from '../../database/prisma-bytes';
import { authenticationTokens } from '../security/authentication-token-service';
import { isEmailBounced } from '../email-suppression/bounced-email';

export type PendingRegistrationStatus =
  | 'pending'
  | 'verified'
  | 'expired'
  // Walkthrough n.º 2 (C01c3): the verification email hard-bounced.
  | 'bounced';

// Walkthrough n.º 4 (C01c2): the phone that registered holds the
// continuation, so it may learn whether that registration's email was
// confirmed meanwhile, elsewhere. Nothing is written; an unknown, used up, or
// lapsed continuation is only «expired», as resend and cancel answer.
export const readPendingRegistrationStatus = async (
  prisma: Pick<PrismaClient, 'authenticationToken' | 'emailSuppression'>,
  input: {
    registrationContinuation: string;
    now: Date;
    /** The address digest the email suppressions are kept by. */
    digestEmail: (email: string) => Uint8Array;
  },
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
          email: true,
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
    continuation.account.clientId === null ||
    continuation.account.deletedAt !== null
  ) {
    return 'expired';
  }
  // Verifying invalidates the continuation with every other open token, so
  // a confirmed email is read before that mark (review of n.º 4).
  if (continuation.account.emailVerifiedAt !== null) return 'verified';
  if (
    continuation.invalidatedAt !== null ||
    continuation.expiresAt <= input.now ||
    continuation.account.pendingExpiresAt === null ||
    continuation.account.pendingExpiresAt <= input.now
  ) {
    return 'expired';
  }
  return (await isEmailBounced(
    prisma,
    input.digestEmail,
    continuation.account.email,
  ))
    ? 'bounced'
    : 'pending';
};
