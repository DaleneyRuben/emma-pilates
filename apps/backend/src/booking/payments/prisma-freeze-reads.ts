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
  auditRecordId: true,
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

type DecisionEnds = { planEndsOn?: string; planEndsOnAfter?: string };

const isCivilText = (value: unknown): value is string =>
  typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);

// The ends written into the decision's audit record (approve, refuse,
// withdraw). Older decisions have none and fall back to the derivation.
const loadDecisionEnds = async (
  prisma: PrismaClient,
  rows: readonly { state: FreezeState; auditRecordId: string | null }[],
): Promise<Map<string, DecisionEnds>> => {
  const ids = rows
    .filter((row) => row.state !== FreezeState.REQUESTED)
    .map((row) => row.auditRecordId)
    .filter((id): id is string => id !== null);
  if (ids.length === 0) return new Map();
  const records = await prisma.auditRecord.findMany({
    where: { id: { in: ids } },
    select: { id: true, metadata: true },
  });
  return new Map(
    records.map((record) => {
      const metadata = (record.metadata ?? {}) as Record<string, unknown>;
      return [
        record.id,
        {
          ...(isCivilText(metadata.planEndsOn)
            ? { planEndsOn: metadata.planEndsOn }
            : {}),
          ...(isCivilText(metadata.planEndsOnAfter)
            ? { planEndsOnAfter: metadata.planEndsOnAfter }
            : {}),
        },
      ];
    }),
  );
};

const toReview = (
  row: {
    id: string;
    startsOn: Date;
    endsOn: Date;
    reason: string;
    state: FreezeState;
    decidedAt: Date | null;
    decidedByAccount: { staffMember: { name: string } | null } | null;
    auditRecordId: string | null;
    client: { name: string; profileImageAssetId: string | null };
    subscription: { planNameSnapshot: string; endsOn: Date };
  },
  recorded: DecisionEnds = {},
) => {
  // Walkthrough finding 52: the plan's end before this Freeze and the end
  // approving it produces. An approved Freeze already moved the stored end
  // by its days; a refused one never moves it.
  const days = frozenDays(row.startsOn, row.endsOn);
  const approved = row.state === FreezeState.APPROVED;
  const before = approved
    ? addCivil(row.subscription.endsOn, -days)
    : row.subscription.endsOn;
  const after =
    row.state === FreezeState.REFUSED || row.state === FreezeState.WITHDRAWN
      ? null
      : addCivil(before, days);
  // A withdrawn request was decided by the Client herself, not by staff.
  const decidedByName =
    row.state === FreezeState.WITHDRAWN
      ? row.client.name
      : (row.decidedByAccount?.staffMember?.name ?? null);
  return {
    id: row.id,
    ...clientNameAndPhoto(row.client),
    planName: row.subscription.planNameSnapshot,
    startsOn: civil(row.startsOn),
    endsOn: civil(row.endsOn),
    reason: row.reason,
    state: row.state.toLowerCase() as
      'requested' | 'approved' | 'refused' | 'withdrawn',
    planEndsOn: recorded.planEndsOn ?? civil(before),
    planEndsOnAfter:
      after === null ? null : (recorded.planEndsOnAfter ?? civil(after)),
    decidedAt: row.decidedAt?.toISOString() ?? null,
    decidedByName,
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
    return rows.map((row) => toReview(row));
  },
  listDecidedFreezes: async (principal: AuthenticatedPrincipal) => {
    requireOperations(principal);
    const rows = await prisma.freeze.findMany({
      where: {
        state: {
          in: [
            FreezeState.APPROVED,
            FreezeState.REFUSED,
            FreezeState.WITHDRAWN,
          ],
        },
        deletedAt: null,
      },
      orderBy: [{ decidedAt: 'desc' }, { createdAt: 'desc' }],
      take: decidedListLimit,
      select: reviewSelect,
    });
    const ends = await loadDecisionEnds(prisma, rows);
    return rows.map((row) =>
      toReview(row, ends.get(row.auditRecordId ?? '') ?? {}),
    );
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
    const ends = await loadDecisionEnds(prisma, [row]);
    return toReview(row, ends.get(row.auditRecordId ?? '') ?? {});
  },
});
