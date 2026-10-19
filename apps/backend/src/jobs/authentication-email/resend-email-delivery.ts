import type { AuthenticationEmailDelivery } from './authentication-email-delivery';

type ResendEmailDeliveryOptions = {
  fetch: typeof fetch;
  apiKey: string;
  from: string;
  replyTo: string;
};

// Red checkpoint stub: the adapter is implemented in the next commit.
export const createResendEmailDelivery = (
  options: ResendEmailDeliveryOptions,
): AuthenticationEmailDelivery => ({
  deliver: () => Promise.resolve(void options),
});
