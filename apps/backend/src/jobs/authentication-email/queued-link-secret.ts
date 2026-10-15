import type {
  AuthenticationEmailStateReader,
  AuthenticationLinkDecryptor,
  AuthenticationLinkPurpose,
} from './process-authentication-email';

export type QueuedLinkSecretDependencies = {
  purpose: AuthenticationLinkPurpose;
  recipient?: string;
  queuedJobs(): Promise<{ data: unknown; createdOn: Date }[]>;
  stateReader: AuthenticationEmailStateReader;
  decryptor: AuthenticationLinkDecryptor;
  now: Date;
};

export function readQueuedLinkSecret(
  dependencies: QueuedLinkSecretDependencies,
): Promise<string | null> {
  return Promise.reject(new Error(`Not implemented: ${dependencies.purpose}`));
}
