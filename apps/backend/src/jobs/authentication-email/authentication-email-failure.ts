export type AuthenticationEmailFailureCategory =
  | 'network'
  | 'timeout'
  | 'rate_limit'
  | 'provider_server'
  | 'invalid_input'
  | 'recipient_rejected'
  | 'missing_configuration'
  | 'provider_authentication'
  | 'permanent'
  | 'unexpected';

export type AuthenticationEmailFailure = {
  category: AuthenticationEmailFailureCategory;
  retryable: boolean;
};

const retryableCategories = new Set<AuthenticationEmailFailureCategory>([
  'network',
  'timeout',
  'rate_limit',
  'provider_server',
]);

export class AuthenticationEmailDeliveryError extends Error {
  constructor(
    readonly category: Exclude<
      AuthenticationEmailFailureCategory,
      'unexpected'
    >,
  ) {
    super('Authentication email delivery failed');
    this.name = 'AuthenticationEmailDeliveryError';
  }
}

export const classifyAuthenticationEmailFailure = (
  error: unknown,
): AuthenticationEmailFailure => {
  const category =
    error instanceof AuthenticationEmailDeliveryError
      ? error.category
      : 'unexpected';

  return {
    category,
    retryable: retryableCategories.has(category),
  };
};
