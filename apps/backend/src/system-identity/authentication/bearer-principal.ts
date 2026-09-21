import { UnauthorizedException } from '@nestjs/common';
import {
  AuthenticationRequiredError,
  type AuthenticatedPrincipal,
} from './resolve-authenticated-principal';

export type PrincipalResolver = (
  credential: string,
  meaningfulActivity: boolean,
) => Promise<AuthenticatedPrincipal>;

const parseBearerCredential = (authorization: string | undefined): string => {
  const match = /^Bearer ([A-Za-z0-9_-]{43})$/.exec(authorization ?? '');
  if (match?.[1] === undefined) {
    throw new UnauthorizedException('Authentication is required');
  }
  return match[1];
};

export const authenticateBearer = async (
  resolvePrincipal: PrincipalResolver,
  authorization: string | undefined,
): Promise<AuthenticatedPrincipal> => {
  try {
    return await resolvePrincipal(parseBearerCredential(authorization), true);
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
