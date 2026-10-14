import type {
  AuthenticationEmailStateReader,
  AuthenticationLinkDecryptor,
} from '../../jobs/authentication-email/process-authentication-email';

type QueuedActivationLinkDependencies = {
  queuedActivationJobs(): Promise<{ data: unknown; createdOn: Date }[]>;
  stateReader: AuthenticationEmailStateReader;
  decryptor: AuthenticationLinkDecryptor;
  adminWebOrigin: string;
  now: Date;
};

export function readQueuedActivationLink(
  dependencies: QueuedActivationLinkDependencies,
): Promise<string | null> {
  return Promise.reject(
    new Error(`not implemented ${dependencies.adminWebOrigin}`),
  );
}
