import type { Environment } from '../../config/environment';
import type { AuthenticationEmailDelivery } from './authentication-email-delivery';
import { LocalEmailCapture } from './local-email-capture';
import { createResendEmailDelivery } from './resend-email-delivery';

type EmailSettings = Pick<
  Environment,
  | 'NODE_ENV'
  | 'RESEND_API_KEY'
  | 'EMAIL_FROM'
  | 'EMAIL_REPLY_TO'
  | 'EMAIL_CAPTURE_DIRECTORY'
>;

// Null leaves authentication email queued: production without a key sends
// nothing, and local capture refuses production.
export const createAuthenticationEmailDelivery = (
  environment: EmailSettings,
  fetch: typeof globalThis.fetch,
): AuthenticationEmailDelivery | null => {
  if (environment.RESEND_API_KEY !== null) {
    return createResendEmailDelivery({
      fetch,
      apiKey: environment.RESEND_API_KEY,
      from: environment.EMAIL_FROM,
      replyTo: environment.EMAIL_REPLY_TO,
    });
  }
  if (environment.NODE_ENV === 'production') return null;
  return new LocalEmailCapture(
    environment.NODE_ENV,
    environment.EMAIL_CAPTURE_DIRECTORY,
  );
};
