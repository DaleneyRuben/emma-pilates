import type { AuthenticationEmailJob } from './authentication-email-job';
import { AuthenticationEmailDeliveryError } from './authentication-email-failure';

export const AUTHENTICATION_EMAIL_DELIVERY_DEADLINE_MS = 10_000;

export type AuthenticationEmailMessage = {
  recipient: string;
  purpose: AuthenticationEmailJob['purpose'];
  subject: string;
  link: string;
};

export interface AuthenticationEmailDelivery {
  deliver(
    message: AuthenticationEmailMessage,
    options: { signal: AbortSignal },
  ): Promise<void>;
}

export const deliverAuthenticationEmail = async (
  delivery: AuthenticationEmailDelivery,
  message: AuthenticationEmailMessage,
): Promise<void> => {
  const controller = new AbortController();
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_resolve, reject) => {
    timeout = setTimeout(() => {
      controller.abort();
      reject(new AuthenticationEmailDeliveryError('timeout'));
    }, AUTHENTICATION_EMAIL_DELIVERY_DEADLINE_MS);
  });

  try {
    await Promise.race([
      delivery.deliver(message, { signal: controller.signal }),
      deadline,
    ]);
  } finally {
    clearTimeout(timeout);
  }
};
