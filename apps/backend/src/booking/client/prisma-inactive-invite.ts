import type { PrismaClient } from '../../generated/prisma/client';
import { hasActivePaidPlan } from '../payments/host-paid-plan';

const firstName = (name: string): string => name.trim().split(/\s+/)[0] ?? '';

/**
 * Walkthrough n.º 22 (C02j): she registered with a Client's code, no Guest
 * Pass was ever opened for her, and that host still has no paid Plan in
 * force, so the code was not active. Read when she has never had a Plan;
 * nothing is stored, so once the host pays the notice goes away.
 */
export const readInactiveInvite = async (
  prisma: Pick<
    PrismaClient,
    'clientAcquisition' | 'guestPass' | 'subscription'
  >,
  clientId: string,
  now: Date,
): Promise<{ hostFirstName: string } | null> => {
  const acquisition = await prisma.clientAcquisition.findFirst({
    where: { clientId, deletedAt: null, referrerClientId: { not: null } },
    select: {
      referrerClient: { select: { id: true, name: true, deletedAt: true } },
    },
  });
  const host = acquisition?.referrerClient ?? null;
  if (host === null || host.deletedAt !== null) return null;
  const passes = await prisma.guestPass.count({
    where: { friendClientId: clientId },
  });
  if (passes > 0) return null;
  if (await hasActivePaidPlan(prisma, host.id, now)) return null;
  return { hostFirstName: firstName(host.name) };
};
