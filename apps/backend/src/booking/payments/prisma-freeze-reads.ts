import type { PrismaClient } from '../../generated/prisma/client';
import { FreezeState } from '../../generated/prisma/client';
import type { AuthenticatedPrincipal } from '../../system-identity/authentication/resolve-authenticated-principal';
import { requireAdministrator } from '../administration/administration-errors';
import { PaymentRuleError } from './payment-errors';

const reviewSelect = {
  id: true,
  startsOn: true,
  endsOn: true,
  reason: true,
  state: true,
  client: { select: { name: true } },
  subscription: { select: { planNameSnapshot: true } },
} as const;

const toReview = (row: {
  id: string;
  startsOn: Date;
  endsOn: Date;
  reason: string;
  state: FreezeState;
  client: { name: string };
  subscription: { planNameSnapshot: string };
}) => ({
  id: row.id,
  clientName: row.client.name,
  planName: row.subscription.planNameSnapshot,
  startsOn: row.startsOn.toISOString().slice(0, 10),
  endsOn: row.endsOn.toISOString().slice(0, 10),
  reason: row.reason,
  state: row.state.toLowerCase() as 'requested' | 'approved' | 'refused',
});

export const createFreezeReads = (prisma: PrismaClient) => ({
  listRequestedFreezes: async (principal: AuthenticatedPrincipal) => {
    requireAdministrator(principal);
    const rows = await prisma.freeze.findMany({
      where: { state: FreezeState.REQUESTED, deletedAt: null },
      orderBy: { createdAt: 'asc' },
      select: reviewSelect,
    });
    return rows.map(toReview);
  },
  readFreezeReview: async (
    command: { freezeId: string },
    principal: AuthenticatedPrincipal,
  ) => {
    requireAdministrator(principal);
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
