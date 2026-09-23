import { UnauthorizedException } from '@nestjs/common';
import type { AuthenticationSurface } from './create-authentication-session';
import {
  AuthenticationRequiredError,
  type AuthenticatedPrincipal,
} from './resolve-authenticated-principal';

export type PrincipalResolver = (
  credential: string,
  meaningfulActivity: boolean,
  surface?: AuthenticationSurface,
) => Promise<AuthenticatedPrincipal>;

// `Bearer` comes from the mobile apps; `AdminSession` is set only by the
// admin-web request middleware from the browser's session cookie.
const credentialPattern = /^(Bearer|AdminSession) ([A-Za-z0-9_-]{43})$/;

export const parseRequestCredential = (
  authorization: string | undefined,
): { credential: string; surface: AuthenticationSurface } => {
  const match = credentialPattern.exec(authorization ?? '');
  if (match?.[2] === undefined) {
    throw new UnauthorizedException('Authentication is required');
  }
  return {
    credential: match[2],
    surface: match[1] === 'AdminSession' ? 'admin_web' : 'mobile',
  };
};

export const authenticateBearer = async (
  resolvePrincipal: PrincipalResolver,
  authorization: string | undefined,
  meaningfulActivity = true,
): Promise<AuthenticatedPrincipal> => {
  const { credential, surface } = parseRequestCredential(authorization);
  try {
    return await resolvePrincipal(credential, meaningfulActivity, surface);
  } catch (error) {
    if (
      error instanceof AuthenticationRequiredError ||
      error instanceof UnauthorizedException
    ) {
      throw new UnauthorizedException('Authentication is required');
    }
    throw error;
  }
};
