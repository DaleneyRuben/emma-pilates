export class LoginThrottledError extends Error {
  constructor(readonly retryAfterSeconds: number) {
    super('Login temporarily unavailable');
  }
}

export const login = async (
  _command: unknown,
  _dependencies: unknown,
): Promise<{ credential: string }> => {
  throw new Error('Not implemented');
};
