import type { AuthenticationEmailJob } from '../../jobs/authentication-email/authentication-email-job';
import type { EncryptedAuthenticationLink } from '../security/authentication-link-cipher';
import type { IssuedAuthenticationToken } from '../security/authentication-token-service';

const verificationLifetimeMilliseconds = 24 * 60 * 60 * 1_000;
const pendingRegistrationLifetimeMilliseconds = 7 * 24 * 60 * 60 * 1_000;
const activationLifetimeMilliseconds = 7 * 24 * 60 * 60 * 1_000;
const pendingInvitationLifetimeMilliseconds = 30 * 24 * 60 * 60 * 1_000;

type StoredAuthenticationToken = {
  id: string;
  digest: Uint8Array;
  expiresAt: Date;
};

type NewSelfRegistration = {
  accountId: string;
  clientId: string;
  name: string;
  email: string;
  passwordHash: string;
  referralCode: string;
  pendingExpiresAt: Date;
  verificationToken: StoredAuthenticationToken;
  continuationToken: StoredAuthenticationToken;
};

type ExistingRegistrationAccount = {
  id: string;
  domainIdentity: 'client' | 'staff';
  pendingFlow: 'self_registration' | 'staff_invitation' | 'none';
};

export interface ClientRegistrationTransaction {
  findAccountByEmail(
    email: string,
  ): Promise<ExistingRegistrationAccount | null>;
  canIssueAuthenticationEmail(input: {
    email: string;
    purpose: 'verification' | 'activation';
    now: Date;
  }): Promise<boolean>;
  recordIssuedAuthenticationEmail(input: {
    email: string;
    purpose: 'verification' | 'activation';
    occurredAt: Date;
  }): Promise<void>;
  createSelfRegistration(registration: NewSelfRegistration): Promise<void>;
  replaceSelfRegistrationVerification(input: {
    accountId: string;
    pendingExpiresAt: Date;
    verificationToken: StoredAuthenticationToken;
  }): Promise<void>;
  replaceStaffInvitationActivation(input: {
    accountId: string;
    pendingExpiresAt: Date;
    activationToken: StoredAuthenticationToken;
  }): Promise<void>;
  scheduleAuthenticationEmail(job: AuthenticationEmailJob): Promise<void>;
}

export interface ClientRegistrationUnitOfWork {
  execute(
    work: (transaction: ClientRegistrationTransaction) => Promise<boolean>,
  ): Promise<boolean>;
}

type RegisterClientDependencies = {
  unitOfWork: ClientRegistrationUnitOfWork;
  passwordHasher: { hash(password: string): Promise<string> };
  tokenIssuer: { issue(): IssuedAuthenticationToken };
  linkCipher: { encrypt(secret: string): EncryptedAuthenticationLink };
  now(): Date;
  newId(): string;
  newReferralCode(): string;
};

export type RegisterClientCommand = {
  name: string;
  email: string;
  password: string;
};

export type RegisterClientResult = {
  email: string;
  registrationContinuation: string;
};

export class RegisterClient {
  constructor(private readonly dependencies: RegisterClientDependencies) {}

  async execute(command: RegisterClientCommand): Promise<RegisterClientResult> {
    const now = this.dependencies.now();
    const email = command.email.trim().toLowerCase();
    const passwordHash = await this.dependencies.passwordHasher.hash(
      command.password,
    );
    const verificationToken = this.dependencies.tokenIssuer.issue();
    const continuationToken = this.dependencies.tokenIssuer.issue();
    const decoyContinuation = this.dependencies.tokenIssuer.issue();
    const encryptedLink = this.dependencies.linkCipher.encrypt(
      verificationToken.secret,
    );
    const accountId = this.dependencies.newId();
    const clientId = this.dependencies.newId();
    const verificationTokenId = this.dependencies.newId();
    const continuationTokenId = this.dependencies.newId();
    const verificationExpiresAt = new Date(
      now.getTime() + verificationLifetimeMilliseconds,
    );
    const pendingExpiresAt = new Date(
      now.getTime() + pendingRegistrationLifetimeMilliseconds,
    );
    const activationExpiresAt = new Date(
      now.getTime() + activationLifetimeMilliseconds,
    );
    const pendingInvitationExpiresAt = new Date(
      now.getTime() + pendingInvitationLifetimeMilliseconds,
    );
    const recordAndScheduleEmail = async (
      transaction: ClientRegistrationTransaction,
      targetAccountId: string,
      authenticationTokenId: string,
      purpose: 'verification' | 'activation',
    ): Promise<void> => {
      await transaction.recordIssuedAuthenticationEmail({
        email,
        purpose,
        occurredAt: now,
      });
      await transaction.scheduleAuthenticationEmail({
        version: 1,
        accountId: targetAccountId,
        authenticationTokenId,
        purpose,
        encryptedLinkSecret: encryptedLink.encryptedLinkSecret,
        encryptionKeyId: encryptedLink.encryptionKeyId,
      });
    };

    const created = await this.dependencies.unitOfWork.execute(
      async (transaction) => {
        const existingAccount = await transaction.findAccountByEmail(email);
        const compatiblePendingAccount =
          existingAccount === null ||
          (existingAccount.domainIdentity === 'client' &&
            existingAccount.pendingFlow !== 'none');

        if (!compatiblePendingAccount) {
          return false;
        }

        const emailPurpose =
          existingAccount?.pendingFlow === 'staff_invitation'
            ? 'activation'
            : 'verification';
        const canIssueEmail = await transaction.canIssueAuthenticationEmail({
          email,
          purpose: emailPurpose,
          now,
        });

        if (!canIssueEmail) {
          return false;
        }

        if (existingAccount !== null) {
          if (
            existingAccount.domainIdentity === 'client' &&
            existingAccount.pendingFlow === 'self_registration'
          ) {
            await transaction.replaceSelfRegistrationVerification({
              accountId: existingAccount.id,
              pendingExpiresAt,
              verificationToken: {
                id: verificationTokenId,
                digest: verificationToken.digest,
                expiresAt: verificationExpiresAt,
              },
            });
            await recordAndScheduleEmail(
              transaction,
              existingAccount.id,
              verificationTokenId,
              'verification',
            );
          } else if (
            existingAccount.domainIdentity === 'client' &&
            existingAccount.pendingFlow === 'staff_invitation'
          ) {
            await transaction.replaceStaffInvitationActivation({
              accountId: existingAccount.id,
              pendingExpiresAt: pendingInvitationExpiresAt,
              activationToken: {
                id: verificationTokenId,
                digest: verificationToken.digest,
                expiresAt: activationExpiresAt,
              },
            });
            await recordAndScheduleEmail(
              transaction,
              existingAccount.id,
              verificationTokenId,
              'activation',
            );
          }

          return false;
        }

        await transaction.createSelfRegistration({
          accountId,
          clientId,
          name: command.name.trim(),
          email,
          passwordHash,
          referralCode: this.dependencies.newReferralCode(),
          pendingExpiresAt,
          verificationToken: {
            id: verificationTokenId,
            digest: verificationToken.digest,
            expiresAt: verificationExpiresAt,
          },
          continuationToken: {
            id: continuationTokenId,
            digest: continuationToken.digest,
            expiresAt: pendingExpiresAt,
          },
        });
        await recordAndScheduleEmail(
          transaction,
          accountId,
          verificationTokenId,
          'verification',
        );

        return true;
      },
    );

    return {
      email,
      registrationContinuation: created
        ? continuationToken.secret
        : decoyContinuation.secret,
    };
  }
}
