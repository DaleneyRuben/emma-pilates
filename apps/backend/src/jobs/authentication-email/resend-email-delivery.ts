import type { AuthenticationEmailDelivery } from './authentication-email-delivery';
import {
  AuthenticationEmailDeliveryError,
  type AuthenticationEmailFailureCategory,
} from './authentication-email-failure';

const sendUrl = 'https://api.resend.com/emails';

type ResendEmailDeliveryOptions = {
  fetch: typeof fetch;
  apiKey: string;
  from: string;
  replyTo: string;
};

// ADR-0094: Resend's daily and monthly quota errors are 429s too, so a
// launch-day burst retries as a rate limit and then fails with that category.
const failureFor = (
  status: number,
): Exclude<AuthenticationEmailFailureCategory, 'unexpected'> => {
  if (status === 429) return 'rate_limit';
  if (status >= 500) return 'provider_server';
  if (status === 401 || status === 403) return 'provider_authentication';
  if (status === 400 || status === 422) return 'invalid_input';
  return 'permanent';
};

export const createResendEmailDelivery = (
  options: ResendEmailDeliveryOptions,
): AuthenticationEmailDelivery => ({
  deliver: async (message, { signal }) => {
    let response: Response;
    try {
      response = await options.fetch(sendUrl, {
        method: 'POST',
        signal,
        headers: {
          authorization: `Bearer ${options.apiKey}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          from: options.from,
          to: [message.recipient],
          reply_to: options.replyTo,
          subject: message.subject,
          text: message.text,
          html: message.html,
          tags: [{ name: 'purpose', value: message.purpose }],
        }),
      });
    } catch {
      throw new AuthenticationEmailDeliveryError(
        signal.aborted ? 'timeout' : 'network',
      );
    }

    if (!response.ok) {
      throw new AuthenticationEmailDeliveryError(failureFor(response.status));
    }
  },
});
