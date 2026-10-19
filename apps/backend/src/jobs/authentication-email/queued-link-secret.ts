import { parseAuthenticationEmailJob } from './authentication-email-job';
import {
  processAuthenticationEmail,
  type AuthenticationEmailStateReader,
  type AuthenticationLinkDecryptor,
  type AuthenticationLinkPurpose,
} from './process-authentication-email';

export type QueuedLinkSecretDependencies = {
  purpose: AuthenticationLinkPurpose;
  recipient?: string;
  queuedJobs(): Promise<{ data: unknown; createdOn: Date }[]>;
  stateReader: AuthenticationEmailStateReader;
  decryptor: AuthenticationLinkDecryptor;
  now: Date;
};

// Until EXT-001 sends email, an operator shell reads a queued link's secret.
// The worker's own checks decide which link is still current; nothing is
// delivered.
export async function readQueuedLinkSecret(
  dependencies: QueuedLinkSecretDependencies,
): Promise<string | null> {
  const jobs = await dependencies.queuedJobs();
  const newestFirst = [...jobs].sort(
    (left, right) => right.createdOn.getTime() - left.createdOn.getTime(),
  );
  const recipient = dependencies.recipient?.trim().toLowerCase();

  for (const queued of newestFirst) {
    const job = parseAuthenticationEmailJob(queued.data);
    if (job.purpose !== dependencies.purpose) continue;
    let secret: string | null = null;
    const outcome = await processAuthenticationEmail(job, dependencies.now, {
      stateReader: dependencies.stateReader,
      decryptor: dependencies.decryptor,
      renderer: {
        render: (input) => {
          if (
            recipient === undefined ||
            input.recipient.toLowerCase() === recipient
          ) {
            secret = input.linkSecret;
          }
          return {
            recipient: input.recipient,
            purpose: input.purpose,
            subject: '',
            link: null,
            text: '',
            html: '',
          };
        },
      },
      delivery: { deliver: () => Promise.resolve() },
      // A shell read stands in for delivery, so suppression never applies.
      suppressions: { isSuppressed: () => Promise.resolve(false) },
    });
    if (outcome === 'delivered' && secret !== null) return secret;
  }
  return null;
}
