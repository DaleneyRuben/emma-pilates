import { parseAuthenticationEmailJob } from '../../jobs/authentication-email/authentication-email-job';
import {
  processAuthenticationEmail,
  type AuthenticationEmailStateReader,
  type AuthenticationLinkDecryptor,
} from '../../jobs/authentication-email/process-authentication-email';

type QueuedActivationLinkDependencies = {
  queuedActivationJobs(): Promise<{ data: unknown; createdOn: Date }[]>;
  stateReader: AuthenticationEmailStateReader;
  decryptor: AuthenticationLinkDecryptor;
  adminWebOrigin: string;
  now: Date;
};

// Until EXT-001 sends email, the first production Administrator (ADR-0083)
// opens their queued Activation Link from an operator shell. The worker's
// own checks decide which link is still current; nothing is delivered.
export async function readQueuedActivationLink(
  dependencies: QueuedActivationLinkDependencies,
): Promise<string | null> {
  const jobs = await dependencies.queuedActivationJobs();
  const newestFirst = [...jobs].sort(
    (left, right) => right.createdOn.getTime() - left.createdOn.getTime(),
  );

  for (const queued of newestFirst) {
    const job = parseAuthenticationEmailJob(queued.data);
    if (job.purpose !== 'activation') continue;
    let secret: string | null = null;
    const outcome = await processAuthenticationEmail(job, dependencies.now, {
      stateReader: dependencies.stateReader,
      decryptor: dependencies.decryptor,
      renderer: {
        render: (input) => {
          secret = input.linkSecret;
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
    });
    if (outcome === 'delivered' && secret !== null) {
      return `${dependencies.adminWebOrigin}/crear-contrasena?token=${encodeURIComponent(secret)}`;
    }
  }
  return null;
}
