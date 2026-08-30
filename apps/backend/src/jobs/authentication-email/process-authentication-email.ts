import type { AuthenticationEmailJob } from './authentication-email-job';

export const processAuthenticationEmail = async (
  _job: AuthenticationEmailJob,
  _now: Date,
  _dependencies: unknown,
): Promise<'delivered'> => {
  throw new Error('Not implemented');
};
