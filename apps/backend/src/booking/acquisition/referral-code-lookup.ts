import type { PrismaClient } from '../../generated/prisma/client';
import { normalizeReferralCode } from './acquisition';
import { findReferralCodeHolder } from './record-client-acquisition';

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
// before her Account exists, with the very rule registration applies
// (`findReferralCodeHolder`), so the two never disagree. A live Client's or
// Trainer's code answers her first name; anything else is «unknown».
export const lookUpReferralCode = async (
  prisma: PrismaClient,
  typed: string,
): Promise<ReferralCodeLookup> => {
  const code = normalizeReferralCode(typed) ?? '';
  const unknown: ReferralCodeLookup = {
    code,
    status: 'unknown',
    holderFirstName: null,
    holderKind: null,
  };
  if (code === '') return unknown;
  const holder = await findReferralCodeHolder(prisma, code);
  if (holder === null) return unknown;
  const name =
    holder.kind === 'client'
      ? (
          await prisma.client.findUniqueOrThrow({
            where: { id: holder.clientId },
            select: { name: true },
          })
        ).name
      : (
          await prisma.staffMember.findUniqueOrThrow({
            where: { id: holder.staffMemberId },
            select: { name: true },
          })
        ).name;
  return {
    code,
    status: 'valid',
    holderFirstName: firstName(name),
    holderKind: holder.kind,
  };
};
