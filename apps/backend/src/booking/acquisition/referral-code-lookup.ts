import type { PrismaClient } from '../../generated/prisma/client';
import { normalizeReferralCode } from './acquisition';

export type ReferralCodeLookup = {
  code: string;
  status: 'valid' | 'unknown';
  /** Only the holder's first name, the most «Crea tu cuenta» shows. */
  holderFirstName: string | null;
  /** A friend's code marks «Recomendación de una amiga», a Trainer's «Una instructora». */
  holderKind: 'client' | 'trainer' | null;
};

const firstName = (name: string): string => name.trim().split(/\s+/)[0] ?? '';

// Walkthrough n.º 18 (C01b5, C01b6): the code a friend types is checked
// before her Account exists. A live Client's or Trainer's code answers her
// first name; anything else, retired codes included, is «unknown», which is
// what registration itself would refuse.
export const lookUpReferralCode = async (
  prisma: Pick<PrismaClient, 'referralCode'>,
  typed: string,
): Promise<ReferralCodeLookup> => {
  const code = normalizeReferralCode(typed) ?? '';
  const row =
    code === ''
      ? null
      : await prisma.referralCode.findFirst({
          where: {
            code,
            retiredAt: null,
            OR: [
              { client: { deletedAt: null } },
              { staffMember: { role: 'TRAINER', deletedAt: null } },
            ],
          },
          select: {
            client: { select: { name: true } },
            staffMember: { select: { name: true } },
          },
        });
  if (row?.client != null) {
    return {
      code,
      status: 'valid',
      holderFirstName: firstName(row.client.name),
      holderKind: 'client',
    };
  }
  if (row?.staffMember != null) {
    return {
      code,
      status: 'valid',
      holderFirstName: firstName(row.staffMember.name),
      holderKind: 'trainer',
    };
  }
  return { code, status: 'unknown', holderFirstName: null, holderKind: null };
};
