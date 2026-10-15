import type { ClientEmailVerificationStatus } from './verify-client-email';

type QueuedClientVerificationDependencies = {
  readSecret(): Promise<string | null>;
  verify(token: string): Promise<ClientEmailVerificationStatus>;
};

export function verifyQueuedClientEmail(
  dependencies: QueuedClientVerificationDependencies,
): Promise<ClientEmailVerificationStatus | 'not_found'> {
  return Promise.reject(
    new Error(`Not implemented: ${typeof dependencies.verify}`),
  );
}
