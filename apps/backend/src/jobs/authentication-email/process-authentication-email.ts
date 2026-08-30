import type { AuthenticationEmailJob } from './authentication-email-job';
import type {
  AuthenticationEmailDelivery,
  AuthenticationEmailMessage,
} from './authentication-email-delivery';
import { deliverAuthenticationEmail } from './authentication-email-delivery';

export type AuthenticationEmailState = {
  accountId: string;
  email: string;
  purpose: AuthenticationEmailJob['purpose'];
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

export interface AuthenticationEmailRenderer {
  render(input: {
    recipient: string;
    purpose: AuthenticationEmailJob['purpose'];
    linkSecret: string;
  }): AuthenticationEmailMessage;
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

  if (
    state === null ||
    state.accountId !== job.accountId ||
    state.purpose !== job.purpose ||
    state.usedAt !== null ||
    state.invalidatedAt !== null ||
    state.expiresAt <= now
  ) {
    return 'stale';
  }

  const linkSecret = await dependencies.decryptor.decrypt(
    job.encryptedLinkSecret,
    job.encryptionKeyId,
  );
  const message = dependencies.renderer.render({
    recipient: state.email,
    purpose: job.purpose,
    linkSecret,
  });

  await deliverAuthenticationEmail(dependencies.delivery, message);

  return 'delivered';
};
