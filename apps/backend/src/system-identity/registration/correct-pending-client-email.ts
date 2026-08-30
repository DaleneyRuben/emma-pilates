import type { EncryptedAuthenticationLink } from '../security/authentication-link-cipher';
import type { IssuedAuthenticationToken } from '../security/authentication-token-service';

const verificationLifetimeMilliseconds = 24 * 60 * 60 * 1_000;
const pendingRegistrationLifetimeMilliseconds = 7 * 24 * 60 * 60 * 1_000;

export type PendingEmailCorrection = {
  continuationDigest: Uint8Array;
  email: string;
  now: Date;
  pendingExpiresAt: Date;
  verificationToken: {
    id: string;
    digest: Uint8Array;
    expiresAt: Date;
  };
  emailJob: {
    version: 1;
    purpose: 'verification';
    authenticationTokenId: string;
    encryptedLinkSecret: string;
    encryptionKeyId: string;
  };
};

export type PendingEmailCorrectionStatus =
  'corrected' | 'expired' | 'email_unavailable' | 'suppressed';

type CorrectPendingClientEmailDependencies = {
  gateway: {
    correctEmail(
      correction: PendingEmailCorrection,
    ): Promise<PendingEmailCorrectionStatus>;
  };
  tokens: {
    digest(secret: string): Uint8Array;
    issue(): IssuedAuthenticationToken;
  };
  linkCipher: { encrypt(secret: string): EncryptedAuthenticationLink };
  now(): Date;
  newId(): string;
};

export class CorrectPendingClientEmail {
  constructor(
    private readonly dependencies: CorrectPendingClientEmailDependencies,
  ) {}

  async execute(command: {
    registrationContinuation: string;
    email: string;
  }): Promise<{ status: PendingEmailCorrectionStatus; email: string }> {
    const now = this.dependencies.now();
    const email = command.email.trim().toLowerCase();
    const verificationToken = this.dependencies.tokens.issue();
    const authenticationTokenId = this.dependencies.newId();
    const encryptedLink = this.dependencies.linkCipher.encrypt(
      verificationToken.secret,
    );
    const status = await this.dependencies.gateway.correctEmail({
      continuationDigest: this.dependencies.tokens.digest(
        command.registrationContinuation,
      ),
      email,
      now,
      pendingExpiresAt: new Date(
        now.getTime() + pendingRegistrationLifetimeMilliseconds,
      ),
      verificationToken: {
        id: authenticationTokenId,
        digest: verificationToken.digest,
        expiresAt: new Date(now.getTime() + verificationLifetimeMilliseconds),
      },
      emailJob: {
        version: 1,
        purpose: 'verification',
        authenticationTokenId,
        encryptedLinkSecret: encryptedLink.encryptedLinkSecret,
        encryptionKeyId: encryptedLink.encryptionKeyId,
      },
    });

    return { status, email };
  }
}
