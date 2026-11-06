import { revokeAuthenticationSessions } from '../authentication/revoke-authentication-sessions';
import type { PgBoss } from 'pg-boss';
import { toPrismaBytes } from '../../database/prisma-bytes';
import {
  AuthenticationSessionRevocationReason,
  AuthenticationTokenPurpose,
} from '../../generated/prisma/enums';
import type { Prisma } from '../../generated/prisma/client';
import { PrismaClientRegistrationTransaction } from '../registration/prisma-client-registration-unit-of-work';
import { removePendingAccount } from '../registration/remove-pending-account';
import {
  dropPendingEmailChange,
  livePendingEmailChange,
  reissuePendingEmailChange,
  storePendingEmailChange,
} from '../email-change/email-change-steps';
import { emailChangeLifetimeMilliseconds } from '../email-change/email-change';
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

  // IDN-008 E2: a 24-hour single-use link to the new address.
  const issueEmailChangeLink = (now: Date) => {
    const token = dependencies.tokenIssuer.issue();
    return {
      token: {
        id: dependencies.newId(),
        digest: token.digest,
        expiresAt: new Date(now.getTime() + emailChangeLifetimeMilliseconds),
      },
      encrypted: dependencies.linkCipher.encrypt(token.secret),
    };
  };

  // The link and the notice share the token; one throttle event for both.
  const sendEmailChange = async (input: {
    accountId: string;
    email: string;
    link: ReturnType<typeof issueEmailChangeLink>;
    purposes: ('email_change' | 'email_change_notice')[];
    now: Date;
  }) => {
    await registration.recordIssuedAuthenticationEmail({
      email: input.email,
      purpose: 'verification',
      occurredAt: input.now,
    });
    for (const purpose of input.purposes) {
      await registration.scheduleAuthenticationEmail({
        version: 1,
        accountId: input.accountId,
        authenticationTokenId: input.link.token.id,
        purpose,
        encryptedLinkSecret: input.link.encrypted.encryptedLinkSecret,
        encryptionKeyId: input.link.encrypted.encryptionKeyId,
      });
    }
  };

  return {
    // WEB-012: whose live Account uses the address, and whether it is pending.
    findAccountByEmail: async (email: string) => {
      const account = await transaction.account.findFirst({
        where: { email, deletedAt: null },
        select: {
          id: true,
          clientId: true,
          staffMemberId: true,
          activatedAt: true,
          emailVerifiedAt: true,
          disabledAt: true,
        },
      });
      if (account === null) return null;
      return {
        id: account.id,
        kind:
          account.clientId === null ? ('staff' as const) : ('client' as const),
        staffMemberId: account.staffMemberId,
        pending:
          account.activatedAt === null &&
          account.emailVerifiedAt === null &&
          account.disabledAt === null,
      };
    },

    activationEmailWaitSeconds: (input: { email: string; now: Date }) =>
      registration.authenticationEmailWaitSeconds({
        email: input.email,
        purpose: 'activation',
        now: input.now,
      }),

    // FIX-039: the studio's email change uses IDN-008's verification lane,
    // keyed by the new address (E7).
    emailChangeWaitSeconds: (input: { email: string; now: Date }) =>
      registration.authenticationEmailWaitSeconds({
        email: input.email,
        purpose: 'verification',
        now: input.now,
      }),

    requestEmailChange: async (input: {
      accountId: string;
      email: string;
      now: Date;
    }) => {
      const link = issueEmailChangeLink(input.now);
      await storePendingEmailChange(transaction, {
        accountId: input.accountId,
        newEmail: input.email,
        token: link.token,
        now: input.now,
      });
      await sendEmailChange({
        accountId: input.accountId,
        email: input.email,
        link,
        purposes: ['email_change', 'email_change_notice'],
        now: input.now,
      });
    },

    resendEmailChange: async (input: { accountId: string; now: Date }) => {
      const pending = await livePendingEmailChange(
        transaction,
        input.accountId,
        input.now,
      );
      if (pending === null) return;
      const link = issueEmailChangeLink(input.now);
      await reissuePendingEmailChange(transaction, {
        accountId: input.accountId,
        token: link.token,
        now: input.now,
      });
      await sendEmailChange({
        accountId: input.accountId,
        email: pending.newEmail,
        link,
        purposes: ['email_change'],
        now: input.now,
      });
    },

    cancelEmailChange: (input: { accountId: string; now: Date }) =>
      dropPendingEmailChange(transaction, input),

    setAccountEmail: async (input: { accountId: string; email: string }) => {
      await transaction.account.update({
        where: { id: input.accountId },
        data: { email: input.email },
      });
    },

    // ADR-0086: «Cancelar invitación» marks the pending Account and Staff
    // Member removed and invalidates every unused link.
    removePendingStaffMember: (input: {
      accountId: string;
      staffMemberId: string;
      now: Date;
    }) =>
      removePendingAccount(transaction, {
        accountId: input.accountId,
        clientId: null,
        staffMemberId: input.staffMemberId,
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
      await revokeAuthenticationSessions(
        transaction,
        { accountId: input.accountId },
        {
          revokedAt: input.now,
          reason: AuthenticationSessionRevocationReason.ACCOUNT_DISABLED,
        },
      );
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
