export class AuthenticationRequiredError extends Error {}

export const resolveAuthenticatedPrincipal = async (
  _credential: string,
  _meaningfulActivity: boolean,
  _dependencies: unknown,
): Promise<unknown> => {
  throw new AuthenticationRequiredError();
};
