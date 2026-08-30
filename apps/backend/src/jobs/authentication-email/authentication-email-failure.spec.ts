import {
  AuthenticationEmailDeliveryError,
  classifyAuthenticationEmailFailure,
} from './authentication-email-failure';

describe('authentication email failure classification', () => {
  it.each(['network', 'timeout', 'rate_limit', 'provider_server'] as const)(
    'retries %s delivery failures',
    (category) => {
      expect(
        classifyAuthenticationEmailFailure(
          new AuthenticationEmailDeliveryError(category),
        ),
      ).toEqual({ category, retryable: true });
    },
  );

  it.each([
    'invalid_input',
    'recipient_rejected',
    'missing_configuration',
    'provider_authentication',
    'permanent',
  ] as const)('does not retry %s delivery failures', (category) => {
    expect(
      classifyAuthenticationEmailFailure(
        new AuthenticationEmailDeliveryError(category),
      ),
    ).toEqual({ category, retryable: false });
  });

  it('sanitizes unexpected failures as permanent', () => {
    expect(
      classifyAuthenticationEmailFailure(
        new Error('provider response containing sensitive details'),
      ),
    ).toEqual({ category: 'unexpected', retryable: false });
  });
});
