import { AuthenticationEmailDeliveryError } from './authentication-email-failure';
import {
  AUTHENTICATION_EMAIL_DELIVERY_DEADLINE_MS,
  deliverAuthenticationEmail,
} from './authentication-email-delivery';

const message = {
  recipient: 'client@example.com',
  purpose: 'verification',
  subject: 'Verify your Pilates account',
  link: 'pilates://verify?token=link-secret',
} as const;

describe('authentication email delivery deadline', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('passes a live cancellation signal to delivery', async () => {
    const deliver = jest
      .fn<Promise<void>, [typeof message, { signal: AbortSignal }]>()
      .mockResolvedValue(undefined);

    await deliverAuthenticationEmail({ deliver }, message);

    expect(deliver).toHaveBeenCalledTimes(1);
    expect(deliver.mock.calls[0][0]).toEqual(message);
    expect(deliver.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal);
    expect(deliver.mock.calls[0][1].signal.aborted).toBe(false);
  });

  it('aborts and reports a timeout after ten seconds', async () => {
    jest.useFakeTimers();
    let deliverySignal: AbortSignal | undefined;
    const delivery = {
      deliver: jest.fn((_message, options: { signal: AbortSignal }) => {
        deliverySignal = options.signal;
        return new Promise<void>(() => undefined);
      }),
    };

    const deliveryAttempt = deliverAuthenticationEmail(delivery, message);
    const timeoutExpectation = expect(deliveryAttempt).rejects.toMatchObject<
      Partial<AuthenticationEmailDeliveryError>
    >({ category: 'timeout' });
    await jest.advanceTimersByTimeAsync(
      AUTHENTICATION_EMAIL_DELIVERY_DEADLINE_MS,
    );

    await timeoutExpectation;
    expect(deliverySignal?.aborted).toBe(true);
  });
});
