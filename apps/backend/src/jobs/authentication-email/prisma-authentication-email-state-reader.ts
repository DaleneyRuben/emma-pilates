import { AuthenticationTokenPurpose } from '../../generated/prisma/enums';
import type { AuthenticationEmailStateReader } from './process-authentication-email';
import type { AuthenticationEmailState } from './process-authentication-email';

type AuthenticationTokenRecord = {
  accountId: string;
  purpose: AuthenticationTokenPurpose;
  expiresAt: Date;
  usedAt: Date | null;
  invalidatedAt: Date | null;
  account: {
    email: string;
    clientId: string | null;
    staffMemberId: string | null;
  };
  emailChange: { newEmail: string } | null;
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
        account: {
          select: { email: true; clientId: true; staffMemberId: true };
        };
        emailChange: { select: { newEmail: true } };
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
        account: {
          select: { email: true, clientId: true, staffMemberId: true },
        },
        emailChange: { select: { newEmail: true } },
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
      identityKind: token.account.staffMemberId === null ? 'client' : 'staff',
      purpose,
      expiresAt: token.expiresAt,
      usedAt: token.usedAt,
      invalidatedAt: token.invalidatedAt,
      pendingEmail: token.emailChange?.newEmail ?? null,
    };
  }
}

const mapPurpose = (
  purpose: AuthenticationTokenPurpose,
): AuthenticationEmailState['purpose'] | null => {
  switch (purpose) {
    case AuthenticationTokenPurpose.VERIFICATION:
      return 'verification';
    case AuthenticationTokenPurpose.ACTIVATION:
      return 'activation';
    case AuthenticationTokenPurpose.PASSWORD_RECOVERY:
      return 'password_recovery';
    case AuthenticationTokenPurpose.EMAIL_CHANGE:
      return 'email_change';
    case AuthenticationTokenPurpose.REGISTRATION_CONTINUATION:
      return null;
  }
};
