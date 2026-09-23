import type { Prisma, PrismaClient } from '../../generated/prisma/client';
import type { AuthenticatedPrincipal } from '../../system-identity/authentication/resolve-authenticated-principal';
import { boliviaInstant } from '../../time/bolivia-time';
import {
  BackOfficeError,
  databaseCause,
  requireAdministrator,
} from '../back-office-errors';
import { requireActiveBranch } from '../booking-references';
import { runIdempotent } from '../prisma-idempotency';

type Transaction = Prisma.TransactionClient;
type Paging = { page: number; pageSize: number };

export type SupplyInput = {
  branchId: string;
  name: string;
  initialQuantity: number;
  lowStockThreshold: number;
};
export type SupplyChange = {
  supplyId: string;
  name: string;
  lowStockThreshold: number;
};
export type MovementInput = { supplyId: string; quantity: number };

const supplySelect = {
  id: true,
  branchId: true,
  name: true,
  quantityOnHand: true,
  lowStockThreshold: true,
  archivedAt: true,
} satisfies Prisma.SupplySelect;

type SupplyRow = Prisma.SupplyGetPayload<{ select: typeof supplySelect }>;

// Low stock is derived, never stored: at or below the threshold (BKO-001 D8).
const toSupplyView = (supply: SupplyRow) => ({
  ...supply,
  lowStock: supply.quantityOnHand <= supply.lowStockThreshold,
});

const isCount = (value: number, minimum: number) =>
  Number.isInteger(value) && value >= minimum;

// The stock triggers and checks are the last word on every quantity.
const translate = (error: unknown): never => {
  if (error instanceof BackOfficeError) throw error;
  const cause = databaseCause(error);
  if (cause.includes('supplies_branch_active_normalized_name_key')) {
    throw new BackOfficeError('supply_name_taken');
  }
  if (cause.includes('supply is archived')) {
    throw new BackOfficeError('supply_archived');
  }
  if (cause.includes('supplies_values_check')) {
    throw new BackOfficeError('insufficient_stock');
  }
  if (cause.includes('violates check constraint') || cause.includes('23514')) {
    throw new BackOfficeError('invalid_back_office_value');
  }
  throw error;
};

// Bolivia month "YYYY-MM" as the instants [start, end).
const monthRange = (month: string) => {
  const [year, monthNumber] = month.split('-').map(Number);
  return {
    start: boliviaInstant(new Date(Date.UTC(year, monthNumber - 1, 1)), 0),
    end: boliviaInstant(new Date(Date.UTC(year, monthNumber, 1)), 0),
  };
};

const movementCommands = {
  withdrawal: 'record_withdrawal',
  restock: 'record_restock',
} as const;

// BKO-002: Supplies, Withdrawals, and Restocks for AW08–AW10 and AW31.
export const createPrismaSupplies = (
  prisma: PrismaClient,
  dependencies: { now: () => Date },
) => {
  const findSupply = async (
    database: Transaction | PrismaClient,
    supplyId: string,
  ) => {
    const supply = await database.supply.findUnique({
      where: { id: supplyId },
      select: supplySelect,
    });
    if (supply === null) throw new BackOfficeError('supply_not_found');
    return supply;
  };

  const recordMovement = async (
    kind: keyof typeof movementCommands,
    input: MovementInput,
    principal: AuthenticatedPrincipal,
    idempotencyKey: string,
  ) => {
    const actor = requireAdministrator(principal);
    if (!isCount(input.quantity, 1)) {
      throw new BackOfficeError('invalid_back_office_value');
    }
    const response = await runIdempotent(
      prisma,
      {
        accountId: actor.accountId,
        command: movementCommands[kind],
        idempotencyKey,
        request: input,
        now: dependencies.now,
      },
      async (transaction) => {
        const supply = await findSupply(transaction, input.supplyId);
        if (supply.archivedAt !== null) {
          throw new BackOfficeError('supply_archived');
        }
        const data = {
          supplyId: supply.id,
          quantity: input.quantity,
          recordedByAccountId: actor.accountId,
          recordedAt: dependencies.now(),
        };
        const movement =
          kind === 'withdrawal'
            ? await transaction.withdrawal.create({ data })
            : await transaction.supplyRestock.create({ data });
        const { quantityOnHand } = await findSupply(transaction, supply.id);
        return {
          id: movement.id,
          supplyId: movement.supplyId,
          quantity: movement.quantity,
          recordedAt: movement.recordedAt.toISOString(),
          quantityOnHand,
        };
      },
    ).catch(translate);
    return { ...response, recordedAt: new Date(response.recordedAt) };
  };

  return {
    listSupplies: async (
      query: { branchId: string },
      principal: AuthenticatedPrincipal,
    ) => {
      requireAdministrator(principal);
      const rows = await prisma.supply.findMany({
        where: { branchId: query.branchId, archivedAt: null },
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
        select: supplySelect,
      });
      return rows.map(toSupplyView);
    },

    createSupply: async (
      input: SupplyInput,
      principal: AuthenticatedPrincipal,
    ) => {
      const actor = requireAdministrator(principal);
      if (
        input.name.trim() === '' ||
        !isCount(input.initialQuantity, 0) ||
        !isCount(input.lowStockThreshold, 0)
      ) {
        throw new BackOfficeError('invalid_back_office_value');
      }
      const now = dependencies.now();
      return prisma
        .$transaction(async (transaction) => {
          await requireActiveBranch(transaction, input.branchId);
          return transaction.supply.create({
            data: {
              branchId: input.branchId,
              name: input.name.trim(),
              initialQuantity: input.initialQuantity,
              quantityOnHand: input.initialQuantity,
              lowStockThreshold: input.lowStockThreshold,
              createdByAccountId: actor.accountId,
              createdAt: now,
              updatedAt: now,
            },
            select: supplySelect,
          });
        })
        .then(toSupplyView, translate);
    },

    updateSupply: async (
      input: SupplyChange,
      principal: AuthenticatedPrincipal,
    ) => {
      requireAdministrator(principal);
      if (input.name.trim() === '' || !isCount(input.lowStockThreshold, 0)) {
        throw new BackOfficeError('invalid_back_office_value');
      }
      return prisma
        .$transaction(async (transaction) => {
          const supply = await findSupply(transaction, input.supplyId);
          if (supply.archivedAt !== null) {
            throw new BackOfficeError('supply_archived');
          }
          return transaction.supply.update({
            where: { id: supply.id },
            data: {
              name: input.name.trim(),
              lowStockThreshold: input.lowStockThreshold,
              updatedAt: dependencies.now(),
            },
            select: supplySelect,
          });
        })
        .then(toSupplyView, translate);
    },

    // One-way: a discontinued Supply leaves AW08 and AW10 and keeps its
    // Withdrawals in AW31 (BKO-001 D9). Archiving again changes nothing.
    archiveSupply: async (
      input: { supplyId: string },
      principal: AuthenticatedPrincipal,
    ) => {
      requireAdministrator(principal);
      return prisma
        .$transaction(async (transaction) => {
          const supply = await findSupply(transaction, input.supplyId);
          if (supply.archivedAt !== null) return supply;
          const now = dependencies.now();
          return transaction.supply.update({
            where: { id: supply.id },
            data: { archivedAt: now, updatedAt: now },
            select: supplySelect,
          });
        })
        .then(toSupplyView, translate);
    },

    recordWithdrawal: (
      input: MovementInput,
      principal: AuthenticatedPrincipal,
      idempotencyKey: string,
    ) => recordMovement('withdrawal', input, principal, idempotencyKey),

    recordRestock: (
      input: MovementInput,
      principal: AuthenticatedPrincipal,
      idempotencyKey: string,
    ) => recordMovement('restock', input, principal, idempotencyKey),

    // AW31: a Branch's Withdrawals in one Bolivia month, newest first, with the
    // month's total per Supply (the consumption report).
    listWithdrawals: async (
      query: Paging & { branchId: string; month: string; supplyId?: string },
      principal: AuthenticatedPrincipal,
    ) => {
      requireAdministrator(principal);
      const { start, end } = monthRange(query.month);
      const where: Prisma.WithdrawalWhereInput = {
        recordedAt: { gte: start, lt: end },
        supply: { branchId: query.branchId },
        ...(query.supplyId === undefined ? {} : { supplyId: query.supplyId }),
      };
      const [rows, totalItems, sums] = await Promise.all([
        prisma.withdrawal.findMany({
          where,
          orderBy: [{ recordedAt: 'desc' }, { id: 'desc' }],
          skip: (query.page - 1) * query.pageSize,
          take: query.pageSize,
          select: {
            id: true,
            supplyId: true,
            quantity: true,
            recordedAt: true,
            supply: { select: { name: true } },
          },
        }),
        prisma.withdrawal.count({ where }),
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
        totalItems,
        items: rows.map((row) => ({
          id: row.id,
          supplyId: row.supplyId,
          supplyName: row.supply.name,
          quantity: row.quantity,
          recordedAt: row.recordedAt,
        })),
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
    },
  };
};

export type Supplies = ReturnType<typeof createPrismaSupplies>;
