import { AuthenticationTokenPurpose } from '../../generated/prisma/enums';
import type { AuthenticationEmailJob } from './authentication-email-job';
import type { AuthenticationEmailStateReader } from './process-authentication-email';
import type { AuthenticationEmailState } from './process-authentication-email';

type AuthenticationTokenRecord = {
  accountId: string;
  purpose: AuthenticationTokenPurpose;
  expiresAt: Date;
  usedAt: Date | null;
  invalidatedAt: Date | null;
  account: { email: string };
};

type AuthenticationTokenReader = {
  authenticationToken: {
    findUnique(input: {
      where: { id: string };
      select: {
        accountId: true;
        purpose: true;
        expiresAt: true;
        usedAt: true;
        invalidatedAt: true;
        account: { select: { email: true } };
      };
    }): Promise<AuthenticationTokenRecord | null>;
  };
};

export class PrismaAuthenticationEmailStateReader implements AuthenticationEmailStateReader {
  constructor(private readonly prisma: AuthenticationTokenReader) {}

  async find(
    authenticationTokenId: string,
  ): Promise<AuthenticationEmailState | null> {
    const token = await this.prisma.authenticationToken.findUnique({
      where: { id: authenticationTokenId },
      select: {
        accountId: true,
        purpose: true,
        expiresAt: true,
        usedAt: true,
        invalidatedAt: true,
        account: { select: { email: true } },
      },
    });

    if (token === null) {
      return null;
    }

    const purpose = mapPurpose(token.purpose);

    if (purpose === null) {
      return null;
    }

    return {
      accountId: token.accountId,
      email: token.account.email,
      purpose,
      expiresAt: token.expiresAt,
      usedAt: token.usedAt,
      invalidatedAt: token.invalidatedAt,
    };
  }
}

const mapPurpose = (
  purpose: AuthenticationTokenPurpose,
): AuthenticationEmailJob['purpose'] | null => {
  switch (purpose) {
    case AuthenticationTokenPurpose.VERIFICATION:
      return 'verification';
    case AuthenticationTokenPurpose.ACTIVATION:
      return 'activation';
    case AuthenticationTokenPurpose.PASSWORD_RECOVERY:
      return 'password_recovery';
    case AuthenticationTokenPurpose.REGISTRATION_CONTINUATION:
      return null;
  }
};
