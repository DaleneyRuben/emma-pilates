import type { AuthenticationEmailJob } from './authentication-email-job';
import type {
  AuthenticationEmailDelivery,
  AuthenticationEmailMessage,
} from './local-email-capture';

export type AuthenticationEmailState = {
  accountId: string;
  email: string;
  purpose: AuthenticationEmailJob['purpose'];
  expiresAt: Date;
  usedAt: Date | null;
  invalidatedAt: Date | null;
};

export interface AuthenticationEmailStateReader {
  find(authenticationTokenId: string): Promise<AuthenticationEmailState>;
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
  _now: Date,
  dependencies: AuthenticationEmailProcessorDependencies,
): Promise<'delivered'> => {
  const state = await dependencies.stateReader.find(job.authenticationTokenId);
  const linkSecret = await dependencies.decryptor.decrypt(
    job.encryptedLinkSecret,
    job.encryptionKeyId,
  );
  const message = dependencies.renderer.render({
    recipient: state.email,
    purpose: job.purpose,
    linkSecret,
  });

  await dependencies.delivery.deliver(message);

  return 'delivered';
};
