import type { AuthenticationEmailJob } from './authentication-email-job';
import type {
  AuthenticationEmailDelivery,
  AuthenticationEmailMessage,
} from './authentication-email-delivery';
import { deliverAuthenticationEmail } from './authentication-email-delivery';

// The purpose a link token carries; the notice job shares its token.
export type AuthenticationLinkPurpose = Exclude<
  AuthenticationEmailJob['purpose'],
  'email_change_notice'
>;

export type AuthenticationEmailState = {
  accountId: string;
  email: string;
  // The address an email change is pending for (IDN-008), else null.
  pendingEmail: string | null;
  purpose: AuthenticationLinkPurpose;
  expiresAt: Date;
  usedAt: Date | null;
  invalidatedAt: Date | null;
};

export interface AuthenticationEmailStateReader {
  find(authenticationTokenId: string): Promise<AuthenticationEmailState | null>;
}

export interface AuthenticationLinkDecryptor {
  decrypt(ciphertext: string, keyId: string): Promise<string>;
}

export type AuthenticationEmailRenderInput = {
  recipient: string;
  purpose: AuthenticationEmailJob['purpose'];
  // Null only for the old-address notice, which carries no link.
  linkSecret: string | null;
  // The pending new address of an email change, for both of its messages.
  newEmail?: string;
};

export interface AuthenticationEmailRenderer {
  render(input: AuthenticationEmailRenderInput): AuthenticationEmailMessage;
}

export type AuthenticationEmailProcessorDependencies = {
  stateReader: AuthenticationEmailStateReader;
  decryptor: AuthenticationLinkDecryptor;
  renderer: AuthenticationEmailRenderer;
  delivery: AuthenticationEmailDelivery;
};

export const processAuthenticationEmail = async (
  job: AuthenticationEmailJob,
  now: Date,
  dependencies: AuthenticationEmailProcessorDependencies,
): Promise<'delivered' | 'stale'> => {
  const state = await dependencies.stateReader.find(job.authenticationTokenId);
  const notice = job.purpose === 'email_change_notice';
  const linkPurpose = notice ? 'email_change' : job.purpose;

  if (
    state === null ||
    state.accountId !== job.accountId ||
    state.purpose !== linkPurpose ||
    state.usedAt !== null ||
    state.invalidatedAt !== null ||
    state.expiresAt <= now ||
    (linkPurpose === 'email_change' && state.pendingEmail === null)
  ) {
    return 'stale';
  }

  const linkSecret = notice
    ? null
    : await dependencies.decryptor.decrypt(
        job.encryptedLinkSecret,
        job.encryptionKeyId,
      );
  const message = dependencies.renderer.render({
    // The link goes to the pending new address; the notice to the current one.
    recipient:
      linkPurpose === 'email_change' && !notice
        ? (state.pendingEmail as string)
        : state.email,
    purpose: job.purpose,
    linkSecret,
    ...(state.pendingEmail === null ? {} : { newEmail: state.pendingEmail }),
  });

  await deliverAuthenticationEmail(dependencies.delivery, message);

  return 'delivered';
};
