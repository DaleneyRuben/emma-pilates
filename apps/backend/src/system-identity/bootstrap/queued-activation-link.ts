import { readQueuedLinkSecret } from '../../jobs/authentication-email/queued-link-secret';
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

// Until EXT-001 sends email, the first production Administrator (ADR-0083)
// opens their queued Activation Link from an operator shell.
export async function readQueuedActivationLink(
  dependencies: QueuedActivationLinkDependencies,
): Promise<string | null> {
  const secret = await readQueuedLinkSecret({
    purpose: 'activation',
    queuedJobs: () => dependencies.queuedActivationJobs(),
    stateReader: dependencies.stateReader,
    decryptor: dependencies.decryptor,
    now: dependencies.now,
  });

  return secret === null
    ? null
    : `${dependencies.adminWebOrigin}/crear-contrasena?token=${encodeURIComponent(secret)}`;
}
