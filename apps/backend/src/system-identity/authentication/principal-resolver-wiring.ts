import type { Provider } from '@nestjs/common';
import { authenticationTokens } from '../security/authentication-token-service';
import type { PrismaImpersonationGateway } from '../impersonation/prisma-impersonation-gateway';
import { authenticatedPrincipalResolver } from './authentication.controller';
import type { AuthenticationSurface } from './create-authentication-session';
import type { PrismaAuthenticationGateway } from './prisma-authentication-gateway';
import { resolveAuthenticatedPrincipal } from './resolve-authenticated-principal';

// The one principal resolver every controller injects (ADR-0030), moved out of
// system-identity.module.ts, which is past the file-size limit.
export const principalResolverProvider = (tokens: {
  authentication: symbol;
  impersonation: symbol;
}): Provider => ({
  provide: authenticatedPrincipalResolver,
  inject: [tokens.authentication, tokens.impersonation],
  useFactory:
    (
      gateway: PrismaAuthenticationGateway,
      impersonations: PrismaImpersonationGateway,
    ) =>
    (
      credential: string,
      meaningfulActivity: boolean,
      surface?: AuthenticationSurface,
    ): ReturnType<typeof resolveAuthenticatedPrincipal> =>
      resolveAuthenticatedPrincipal(
        credential,
        meaningfulActivity,
        {
          digestCredential: authenticationTokens.digest,
          findSessionByCredentialDigest: (digest) =>
            gateway.findSessionByCredentialDigest(digest),
          recordMeaningfulActivity: (input) =>
            gateway.recordMeaningfulActivity(input),
          // FUT-001: an expired or revoked Impersonation ends on its own.
          endImpersonation: async (end) => {
            await impersonations.end({ ...end, actorAccountId: null });
          },
          now: () => new Date(),
        },
        surface,
      ),
});
