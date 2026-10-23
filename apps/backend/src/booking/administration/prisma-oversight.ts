import {
  EvaluationState,
  PaymentMethod,
  PaymentState,
  ReferralState,
  type Prisma,
  type PrismaClient,
} from '../../generated/prisma/client';
import type { AuthenticatedPrincipal } from '../../system-identity/authentication/resolve-authenticated-principal';
import { boliviaDate } from '../../time/bolivia-time';
import { readEvaluationKinds } from '../evaluations/evaluation-kinds';
import { containsPattern } from '../search-pattern';
import { requireAdministrator } from './administration-errors';

type Paging = { page: number; pageSize: number };

const offset = ({ page, pageSize }: Paging) => (page - 1) * pageSize;

const methodNames: Record<PaymentMethod, 'cash' | 'transfer' | 'credit_only'> =
  {
    [PaymentMethod.CASH]: 'cash',
    [PaymentMethod.TRANSFER]: 'transfer',
    [PaymentMethod.CREDIT_ONLY]: 'credit_only',
  };

// ADM-001 slices D and E: read-only oversight for AW25–AW27 and the income
// half of AW16 (expenses join from Back Office in BKO-002).
export const createPrismaOversight = (
  prisma: PrismaClient,
  dependencies: { now: () => Date },
) => ({
  listEvaluations: async (
    query: Paging & {
      from: Date;
      until: Date;
      nutritionistStaffMemberId?: string;
      branchId?: string;
    },
    principal: AuthenticatedPrincipal,
  ) => {
    requireAdministrator(principal);
    const where: Prisma.EvaluationWhereInput = {
      state: EvaluationState.BOOKED,
      slot: {
        startsAt: { gte: query.from, lt: query.until },
        ...(query.branchId === undefined ? {} : { branchId: query.branchId }),
        ...(query.nutritionistStaffMemberId === undefined
          ? {}
          : { nutritionistStaffMemberId: query.nutritionistStaffMemberId }),
      },
    };
    const [rows, totalItems] = await Promise.all([
      prisma.evaluation.findMany({
        where,
        orderBy: [{ slot: { startsAt: 'asc' } }, { id: 'asc' }],
        skip: offset(query),
        take: query.pageSize,
        select: {
          id: true,
          clientId: true,
          client: { select: { name: true } },
          slot: {
            select: {
              startsAt: true,
              endsAt: true,
              branchId: true,
              branch: { select: { name: true } },
              nutritionist: { select: { id: true, name: true } },
            },
          },
        },
      }),
      prisma.evaluation.count({ where }),
    ]);
    const kindOf = await readEvaluationKinds(
      prisma,
      rows.map((row) => row.clientId),
    );
    return {
      items: rows.map((row) => ({
        evaluationId: row.id,
        clientName: row.client.name,
        nutritionistStaffMemberId: row.slot.nutritionist.id,
        nutritionistName: row.slot.nutritionist.name,
        branchId: row.slot.branchId,
        branchName: row.slot.branch.name,
        startsAt: row.slot.startsAt,
        endsAt: row.slot.endsAt,
        kind: kindOf(row.clientId, row.slot.startsAt),
      })),
      page: query.page,
      pageSize: query.pageSize,
      totalItems,
    };
  },

  listReferrals: async (
    query: Paging & { query?: string },
    principal: AuthenticatedPrincipal,
  ) => {
    requireAdministrator(principal);
    const ids =
      query.query === undefined || query.query.trim() === ''
        ? undefined
        : (
            await prisma.$queryRaw<{ id: string }[]>`
              SELECT r.id
              FROM booking.referrals r
              JOIN booking.clients referrer ON referrer.id = r.referrer_client_id
              JOIN booking.clients referred ON referred.id = r.referred_client_id
              WHERE booking.search_text(referrer.name) LIKE booking.search_text(${containsPattern(query.query)})
                 OR booking.search_text(referred.name) LIKE booking.search_text(${containsPattern(query.query)})`
          ).map(({ id }) => id);
    const where: Prisma.ReferralWhereInput =
      ids === undefined ? {} : { id: { in: ids } };
    const [rows, totalItems, byState] = await Promise.all([
      prisma.referral.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        skip: offset(query),
        take: query.pageSize,
        select: {
          id: true,
          state: true,
          createdAt: true,
          awardedAt: true,
          referrerClientId: true,
          referrer: { select: { name: true } },
          referred: { select: { name: true } },
        },
      }),
      prisma.referral.count({ where }),
      // AW26's subtitle counts the whole studio, whatever the search.
      prisma.referral.groupBy({ by: ['state'], _count: { _all: true } }),
    ]);
    // "N referidas en total": every Referral of the referrer, not only
    // the ones the search kept.
    const referrerTotals = await prisma.referral.groupBy({
      by: ['referrerClientId'],
      where: {
        referrerClientId: {
          in: [...new Set(rows.map((row) => row.referrerClientId))],
        },
      },
      _count: { _all: true },
    });
    const countOf = (state: ReferralState) =>
      byState.find((group) => group.state === state)?._count._all ?? 0;
    return {
      items: rows.map((row) => ({
        referralId: row.id,
        referrerName: row.referrer.name,
        referrerReferralCount:
          referrerTotals.find(
            (group) => group.referrerClientId === row.referrerClientId,
          )?._count._all ?? 0,
        referredName: row.referred.name,
        registeredAt: row.createdAt,
        awardedAt: row.awardedAt,
        state:
          row.state === 'AWARDED' ? ('awarded' as const) : ('pending' as const),
      })),
      page: query.page,
      pageSize: query.pageSize,
      totalItems,
      awardedCount: countOf(ReferralState.AWARDED),
      pendingCount: countOf(ReferralState.PENDING),
    };
  },

  // CONTEXT-MAP: cash income belongs to its collection Branch; transfer and
  // Credit-only Payments appear only in the all-Branches result.
  incomeReport: async (
    query: { from: Date; until: Date; branchId?: string },
    principal: AuthenticatedPrincipal,
  ) => {
    requireAdministrator(principal);
    const payments = await prisma.payment.findMany({
      where: {
        state: PaymentState.CONFIRMED,
        decidedAt: { gte: query.from, lt: query.until },
        ...(query.branchId === undefined
          ? {}
          : {
              method: PaymentMethod.CASH,
              collectedAtBranchId: query.branchId,
            }),
      },
      select: { method: true, amountDueCentavos: true, decidedAt: true },
    });
    const byMethod = { cash: 0, transfer: 0, credit_only: 0 };
    const months = new Map<string, number>();
    for (const payment of payments) {
      byMethod[methodNames[payment.method]] += payment.amountDueCentavos;
      const month = `${boliviaDate(payment.decidedAt!).toISOString().slice(0, 7)}-01`;
      months.set(month, (months.get(month) ?? 0) + payment.amountDueCentavos);
    }
    return {
      from: query.from,
      until: query.until,
      branchId: query.branchId ?? null,
      totalCentavos: byMethod.cash + byMethod.transfer + byMethod.credit_only,
      byMethod,
      months: [...months.entries()]
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([month, totalCentavos]) => ({ month, totalCentavos })),
      generatedAt: dependencies.now(),
    };
  },
});

export type Oversight = ReturnType<typeof createPrismaOversight>;
