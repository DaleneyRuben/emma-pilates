import type { PrismaClient } from '../../generated/prisma/client';
import type { ReferralCodeLookup } from './referral-code-lookup';

export type InviteCodeLookup = ReferralCodeLookup & { freeClass: boolean };

export const lookUpInviteCode = (
  _prisma: PrismaClient,
  _typed: string,
  _now: Date,
): Promise<InviteCodeLookup> => Promise.reject(new Error('not implemented'));
