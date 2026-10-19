import type { Environment } from '../../config/environment';
import type { AuthenticationEmailDelivery } from './authentication-email-delivery';

// Red checkpoint stub: the selection is implemented in the next commit.
export const createAuthenticationEmailDelivery = (
  environment: Pick<Environment, 'NODE_ENV'>,
  fetch: typeof globalThis.fetch,
): AuthenticationEmailDelivery | null => (environment && fetch ? null : null);
