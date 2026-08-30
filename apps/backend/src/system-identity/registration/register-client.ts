import type { AuthenticationEmailJob } from '../../jobs/authentication-email/authentication-email-job';
import type { EncryptedAuthenticationLink } from '../security/authentication-link-cipher';
import type { IssuedAuthenticationToken } from '../security/authentication-token-service';

const verificationLifetimeMilliseconds = 24 * 60 * 60 * 1_000;
const pendingRegistrationLifetimeMilliseconds = 7 * 24 * 60 * 60 * 1_000;

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
  pendingFlow: 'self_registration' | 'staff_invitation' | 'none';
};

export interface ClientRegistrationTransaction {
  findAccountByEmail(
    email: string,
  ): Promise<ExistingRegistrationAccount | null>;
  createSelfRegistration(registration: NewSelfRegistration): Promise<void>;
  replaceSelfRegistrationVerification(input: {
    accountId: string;
    pendingExpiresAt: Date;
    verificationToken: StoredAuthenticationToken;
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

    const created = await this.dependencies.unitOfWork.execute(
      async (transaction) => {
        const existingAccount = await transaction.findAccountByEmail(email);

        if (existingAccount !== null) {
          if (existingAccount.pendingFlow === 'self_registration') {
            await transaction.replaceSelfRegistrationVerification({
              accountId: existingAccount.id,
              pendingExpiresAt,
              verificationToken: {
                id: verificationTokenId,
                digest: verificationToken.digest,
                expiresAt: verificationExpiresAt,
              },
            });
            await transaction.scheduleAuthenticationEmail({
              version: 1,
              accountId: existingAccount.id,
              authenticationTokenId: verificationTokenId,
              purpose: 'verification',
              encryptedLinkSecret: encryptedLink.encryptedLinkSecret,
              encryptionKeyId: encryptedLink.encryptionKeyId,
            });
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
        await transaction.scheduleAuthenticationEmail({
          version: 1,
          accountId,
          authenticationTokenId: verificationTokenId,
          purpose: 'verification',
          encryptedLinkSecret: encryptedLink.encryptedLinkSecret,
          encryptionKeyId: encryptedLink.encryptionKeyId,
        });

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
