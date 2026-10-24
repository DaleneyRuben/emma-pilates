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

// @db.Date arrives as local midnight. toISOString() throws on that before UTC.
const civilDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

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
  startsOn: civilDate(row.startsOn),
  endsOn: civilDate(row.endsOn),
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
