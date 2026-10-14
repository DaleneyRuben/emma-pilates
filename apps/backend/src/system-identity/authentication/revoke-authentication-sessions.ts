import type { Prisma } from '../../generated/prisma/client';
import type { AuthenticationSessionRevocationReason } from '../../generated/prisma/enums';

export const revokeAuthenticationSessions = (
  transaction: Prisma.TransactionClient,
  where: Prisma.AuthenticationSessionWhereInput,
  input: { revokedAt: Date; reason: AuthenticationSessionRevocationReason },
): Promise<number> =>
  Promise.reject(
    new Error(
      `not implemented: ${typeof transaction} ${JSON.stringify(where)} ${input.reason}`,
    ),
  );
