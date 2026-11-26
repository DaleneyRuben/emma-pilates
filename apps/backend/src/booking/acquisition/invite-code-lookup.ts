import type { PrismaClient } from '../../generated/prisma/client';
import { hasActivePaidPlan } from '../payments/host-paid-plan';
import { findReferralCodeHolder } from './record-client-acquisition';
import {
  lookUpReferralCode,
  type ReferralCodeLookup,
} from './referral-code-lookup';

export type InviteCodeLookup = ReferralCodeLookup & { freeClass: boolean };

/**
 * Walkthrough n.º 13 + 22 (review): the invite page promises a free class
 * only for a code that opens a Guest Pass, a Client's whose paid Plan is in
 * force (BKM-014). A Trainer's code, or a Client's without one, still
 * carries the code. Internal to the page: the public lookup never says
 * whether someone has a Plan.
 */
export const lookUpInviteCode = async (
  prisma: PrismaClient,
  typed: string,
  now: Date,
): Promise<InviteCodeLookup> => {
  const found = await lookUpReferralCode(prisma, typed);
  if (found.status !== 'valid' || found.holderKind !== 'client') {
    return { ...found, freeClass: false };
  }
  const holder = await findReferralCodeHolder(prisma, found.code);
  return {
    ...found,
    freeClass:
      holder?.kind === 'client' &&
      (await hasActivePaidPlan(prisma, holder.clientId, now)),
  };
};
