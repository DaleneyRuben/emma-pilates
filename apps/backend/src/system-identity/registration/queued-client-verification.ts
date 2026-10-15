import type { ClientEmailVerificationStatus } from './verify-client-email';

type QueuedClientVerificationDependencies = {
  readSecret(): Promise<string | null>;
  verify(token: string): Promise<ClientEmailVerificationStatus>;
};

export async function verifyQueuedClientEmail(
  dependencies: QueuedClientVerificationDependencies,
): Promise<ClientEmailVerificationStatus | 'not_found'> {
  const secret = await dependencies.readSecret();

  return secret === null ? 'not_found' : dependencies.verify(secret);
}
