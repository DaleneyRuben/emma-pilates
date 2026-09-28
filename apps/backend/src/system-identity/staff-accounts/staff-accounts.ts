import type { PgBoss } from 'pg-boss';
import { toPrismaBytes } from '../../database/prisma-bytes';
import {
  AuthenticationSessionRevocationReason,
  AuthenticationTokenPurpose,
} from '../../generated/prisma/enums';
import type { Prisma } from '../../generated/prisma/client';
import { PrismaClientRegistrationTransaction } from '../registration/prisma-client-registration-unit-of-work';
import type { EncryptedAuthenticationLink } from '../security/authentication-link-cipher';
import type { IssuedAuthenticationToken } from '../security/authentication-token-service';

// System Identity's Account operations for Staff Members, run inside the
// Booking & Membership staff-management transaction (IDN-007): the Account,
// its Activation Link, the recipient throttle, the queued email, and
// disabling with Authentication Session revocation stay owned here.
export type StaffAccountDependencies = {
  boss: Pick<PgBoss, 'send'>;
  digestEmail(email: string): Uint8Array;
  linkCipher: { encrypt: (secret: string) => EncryptedAuthenticationLink };
  tokenIssuer: { issue: () => IssuedAuthenticationToken };
  now: () => Date;
  newId: () => string;
};

// Nest token for the runtime pieces the System Identity module shares with
// the staff-management composition: pg-boss, the email digest, the link
// cipher, and the token issuer.
export const staffAccountRuntime = Symbol('staffAccountRuntime');

export type StaffAccountRuntime = Omit<
  StaffAccountDependencies,
  'now' | 'newId'
>;

export const createStaffAccountOperations = (
  transaction: Prisma.TransactionClient,
  dependencies: StaffAccountDependencies,
) => {
  const registration = new PrismaClientRegistrationTransaction(
    transaction,
    dependencies.boss,
    (email) => dependencies.digestEmail(email),
    dependencies.now,
  );

  // Records the throttle event and queues the email for a freshly stored link.
  const sendActivation = async (input: {
    accountId: string;
    email: string;
    tokenId: string;
    link: EncryptedAuthenticationLink;
  }) => {
    await registration.recordIssuedAuthenticationEmail({
      email: input.email,
      purpose: 'activation',
      occurredAt: dependencies.now(),
    });
    await registration.scheduleAuthenticationEmail({
      version: 1,
      accountId: input.accountId,
      authenticationTokenId: input.tokenId,
      purpose: 'activation',
      encryptedLinkSecret: input.link.encryptedLinkSecret,
      encryptionKeyId: input.link.encryptionKeyId,
    });
  };

  return {
    findAccountByEmail: (email: string) =>
      transaction.account.findFirst({
        where: { email, deletedAt: null },
        select: { id: true },
      }),

    canIssueActivationEmail: (input: { email: string; now: Date }) =>
      registration.canIssueAuthenticationEmail({
        email: input.email,
        purpose: 'activation',
        now: input.now,
      }),

    createPendingAccount: async (input: {
      accountId: string;
      staffMemberId: string;
      email: string;
      pendingExpiresAt: Date;
      activationExpiresAt: Date;
    }) => {
      const token = dependencies.tokenIssuer.issue();
      const tokenId = dependencies.newId();
      await transaction.account.create({
        data: {
          id: input.accountId,
          email: input.email,
          staffMemberId: input.staffMemberId,
          pendingExpiresAt: input.pendingExpiresAt,
          authenticationTokens: {
            create: {
              id: tokenId,
              purpose: AuthenticationTokenPurpose.ACTIVATION,
              tokenDigest: toPrismaBytes(token.digest),
              expiresAt: input.activationExpiresAt,
            },
          },
        },
      });
      await sendActivation({
        accountId: input.accountId,
        email: input.email,
        tokenId,
        link: dependencies.linkCipher.encrypt(token.secret),
      });
    },

    reissueActivation: async (input: {
      accountId: string;
      email: string;
      pendingExpiresAt: Date;
      activationExpiresAt: Date;
    }) => {
      const token = dependencies.tokenIssuer.issue();
      const tokenId = dependencies.newId();
      await registration.replaceStaffInvitationActivation({
        accountId: input.accountId,
        pendingExpiresAt: input.pendingExpiresAt,
        activationToken: {
          id: tokenId,
          digest: token.digest,
          expiresAt: input.activationExpiresAt,
        },
      });
      await sendActivation({
        accountId: input.accountId,
        email: input.email,
        tokenId,
        link: dependencies.linkCipher.encrypt(token.secret),
      });
    },

    // ADR-0030: disabling revokes every Authentication Session; unused links
    // can no longer activate or recover the Account.
    disableAccount: async (input: { accountId: string; now: Date }) => {
      await transaction.account.update({
        where: { id: input.accountId },
        data: { disabledAt: input.now },
      });
      await transaction.authenticationSession.updateMany({
        where: { accountId: input.accountId, revokedAt: null },
        data: {
          revokedAt: input.now,
          revocationReason:
            AuthenticationSessionRevocationReason.ACCOUNT_DISABLED,
        },
      });
      await transaction.authenticationToken.updateMany({
        where: {
          accountId: input.accountId,
          usedAt: null,
          invalidatedAt: null,
        },
        data: { invalidatedAt: input.now },
      });
    },
  };
};
