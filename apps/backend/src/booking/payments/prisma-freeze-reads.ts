import type { PrismaClient } from '../../generated/prisma/client';
import { FreezeState } from '../../generated/prisma/client';
import type { AuthenticatedPrincipal } from '../../system-identity/authentication/resolve-authenticated-principal';
import { requireOperations } from '../administration/administration-errors';
import {
  clientNameAndPhoto,
  clientNameSelect,
} from '../client/client-photo-of';
import { PaymentRuleError } from './payment-errors';

const reviewSelect = {
  id: true,
  startsOn: true,
  endsOn: true,
  reason: true,
  state: true,
  decidedAt: true,
  decidedByAccount: { select: { staffMember: { select: { name: true } } } },
  client: clientNameSelect,
  subscription: { select: { planNameSnapshot: true, endsOn: true } },
} as const;

const civil = (date: Date) => date.toISOString().slice(0, 10);

const addCivil = (date: Date, days: number) =>
  new Date(date.getTime() + days * 86_400_000);

const frozenDays = (startsOn: Date, endsOn: Date) =>
  Math.round((endsOn.getTime() - startsOn.getTime()) / 86_400_000) + 1;

const toReview = (row: {
  id: string;
  startsOn: Date;
  endsOn: Date;
  reason: string;
  state: FreezeState;
  decidedAt: Date | null;
  decidedByAccount: { staffMember: { name: string } | null } | null;
  client: { name: string; profileImageAssetId: string | null };
  subscription: { planNameSnapshot: string; endsOn: Date };
}) => {
  // Walkthrough finding 52: the plan's end before this Freeze and the end
  // approving it produces. An approved Freeze already moved the stored end
  // by its days; a refused one never moves it.
  const days = frozenDays(row.startsOn, row.endsOn);
  const approved = row.state === FreezeState.APPROVED;
  const before = approved
    ? addCivil(row.subscription.endsOn, -days)
    : row.subscription.endsOn;
  const after =
    row.state === FreezeState.REFUSED ? null : addCivil(before, days);
  return {
    id: row.id,
    ...clientNameAndPhoto(row.client),
    planName: row.subscription.planNameSnapshot,
    startsOn: civil(row.startsOn),
    endsOn: civil(row.endsOn),
    reason: row.reason,
    state: row.state.toLowerCase() as 'requested' | 'approved' | 'refused',
    planEndsOn: civil(before),
    planEndsOnAfter: after === null ? null : civil(after),
    decidedAt: row.decidedAt?.toISOString() ?? null,
    decidedByName: row.decidedByAccount?.staffMember?.name ?? null,
  };
};

// The latest decisions first, so Congelamientos can show what was decided.
const decidedListLimit = 50;

export const createFreezeReads = (prisma: PrismaClient) => ({
  listRequestedFreezes: async (principal: AuthenticatedPrincipal) => {
    requireOperations(principal);
    const rows = await prisma.freeze.findMany({
      where: { state: FreezeState.REQUESTED, deletedAt: null },
      orderBy: { createdAt: 'asc' },
      select: reviewSelect,
    });
    return rows.map(toReview);
  },
  listDecidedFreezes: async (principal: AuthenticatedPrincipal) => {
    requireOperations(principal);
    const rows = await prisma.freeze.findMany({
      where: {
        state: { in: [FreezeState.APPROVED, FreezeState.REFUSED] },
        deletedAt: null,
      },
      orderBy: [{ decidedAt: 'desc' }, { createdAt: 'desc' }],
      take: decidedListLimit,
      select: reviewSelect,
    });
    return rows.map(toReview);
  },
  readFreezeReview: async (
    command: { freezeId: string },
    principal: AuthenticatedPrincipal,
  ) => {
    requireOperations(principal);
    const row = await prisma.freeze.findFirst({
      where: { id: command.freezeId, deletedAt: null },
      select: reviewSelect,
    });
    if (row === null) {
      throw new PaymentRuleError(
        'freeze_not_allowed',
        'Este plan no se puede congelar.',
      );
    }
    return toReview(row);
  },
});
