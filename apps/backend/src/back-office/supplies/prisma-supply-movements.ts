import type { Prisma, PrismaClient } from '../../generated/prisma/client';
import { boliviaInstant } from '../../time/bolivia-time';

export type SupplyMovementKind = 'withdrawal' | 'restock';
export type SupplyMovementFilter = SupplyMovementKind | 'all';

export type SupplyMovementQuery = {
  branchId: string;
  month: string;
  supplyId?: string;
  kind?: SupplyMovementFilter;
  page: number;
  pageSize: number;
};

// Bolivia month "YYYY-MM" as the instants [start, end).
const monthRange = (month: string) => {
  const [year, monthNumber] = month.split('-').map(Number);
  return {
    start: boliviaInstant(new Date(Date.UTC(year, monthNumber - 1, 1)), 0),
    end: boliviaInstant(new Date(Date.UTC(year, monthNumber, 1)), 0),
  };
};

const movementSelect = {
  id: true,
  supplyId: true,
  quantity: true,
  recordedAt: true,
  supply: { select: { name: true } },
  recordedByAccount: {
    select: {
      email: true,
      staffMember: { select: { name: true } },
      client: { select: { name: true } },
    },
  },
} satisfies Prisma.WithdrawalSelect & Prisma.SupplyRestockSelect;

type MovementRow = Prisma.WithdrawalGetPayload<{
  select: typeof movementSelect;
}>;

const toMovement = (kind: SupplyMovementKind) => (row: MovementRow) => ({
  id: row.id,
  kind,
  supplyId: row.supplyId,
  supplyName: row.supply.name,
  quantity: row.quantity,
  recordedAt: row.recordedAt,
  recordedByName:
    row.recordedByAccount.staffMember?.name ??
    row.recordedByAccount.client?.name ??
    row.recordedByAccount.email,
});

type Movement = ReturnType<ReturnType<typeof toMovement>>;

const newestFirst = (left: Movement, right: Movement) =>
  right.recordedAt.getTime() - left.recordedAt.getTime() ||
  (right.id > left.id ? 1 : right.id < left.id ? -1 : 0);

// AW31 and walkthrough finding 102: a Branch's Withdrawals and Restocks in one
// Bolivia month, newest first, each with who recorded it, and the month's
// Withdrawal total per Supply (the consumption report, whatever the kind).
// Without a kind the list is Withdrawals only, as older admin builds read it.
// Both tables are read up to the requested page and merged: a Branch logs a
// few dozen movements a month, so no union query is worth its raw SQL.
export const listSupplyMovements = async (
  prisma: PrismaClient,
  query: SupplyMovementQuery,
) => {
  const kind = query.kind ?? 'withdrawal';
  const { start, end } = monthRange(query.month);
  const where = {
    recordedAt: { gte: start, lt: end },
    supply: { branchId: query.branchId },
    ...(query.supplyId === undefined ? {} : { supplyId: query.supplyId }),
  } satisfies Prisma.WithdrawalWhereInput & Prisma.SupplyRestockWhereInput;
  const window = {
    where,
    orderBy: [{ recordedAt: 'desc' as const }, { id: 'desc' as const }],
    take: query.page * query.pageSize,
    select: movementSelect,
  };
  const wants = (wanted: SupplyMovementKind) =>
    kind === 'all' || kind === wanted;
  const [withdrawals, restocks, withdrawalCount, restockCount, sums] =
    await Promise.all([
      wants('withdrawal') ? prisma.withdrawal.findMany(window) : [],
      wants('restock') ? prisma.supplyRestock.findMany(window) : [],
      wants('withdrawal') ? prisma.withdrawal.count({ where }) : 0,
      wants('restock') ? prisma.supplyRestock.count({ where }) : 0,
      prisma.withdrawal.groupBy({
        by: ['supplyId'],
        where,
        _sum: { quantity: true },
      }),
    ]);
  const names = new Map(
    (
      await prisma.supply.findMany({
        where: { id: { in: sums.map((sum) => sum.supplyId) } },
        select: { id: true, name: true },
      })
    ).map((supply) => [supply.id, supply.name]),
  );
  return {
    month: query.month,
    page: query.page,
    pageSize: query.pageSize,
    totalItems: withdrawalCount + restockCount,
    items: [
      ...withdrawals.map(toMovement('withdrawal')),
      ...restocks.map(toMovement('restock')),
    ]
      .sort(newestFirst)
      .slice((query.page - 1) * query.pageSize, query.page * query.pageSize),
    totals: sums
      .map((sum) => ({
        supplyId: sum.supplyId,
        supplyName: names.get(sum.supplyId) ?? '',
        quantity: sum._sum.quantity ?? 0,
      }))
      .sort((left, right) =>
        left.supplyName.localeCompare(right.supplyName, 'es'),
      ),
  };
};
