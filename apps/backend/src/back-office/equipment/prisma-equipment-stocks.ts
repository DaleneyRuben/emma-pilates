import type { PrismaClient } from '../../generated/prisma/client';
import { EquipmentTracking } from '../../generated/prisma/enums';
import type { AuthenticatedPrincipal } from '../../system-identity/authentication/resolve-authenticated-principal';
import { BackOfficeError } from '../back-office-errors';
import { requireActiveBranch } from '../booking-references';
import { requireEquipmentManager } from './equipment-access';
import {
  issueSelect,
  toIssueView,
  translateEquipmentError,
} from './equipment-records';
import {
  auditQuantityChange,
  recordStockDamage,
  toStockView,
  writeStockQuantity,
  type EquipmentStockView,
} from './equipment-stock-records';
import { compareEquipmentTypes } from './equipment-types';

export type { EquipmentStockView } from './equipment-stock-records';

// The Branch's count of every quantity type not archived, zero where it has
// none yet; usable is the count less its open damage.
export const listBranchStocks = async (
  database: PrismaClient,
  branchId: string,
): Promise<EquipmentStockView[]> => {
  const types = await database.equipmentType.findMany({
    where: { archivedAt: null, tracking: EquipmentTracking.QUANTITY },
    select: {
      id: true,
      name: true,
      legacyKind: true,
      stocks: {
        where: { branchId },
        select: {
          quantity: true,
          issues: { where: { resolvedAt: null }, select: { quantity: true } },
        },
      },
    },
  });
  return types
    .sort((first, second) =>
      compareEquipmentTypes(
        { ...first, legacyKind: null },
        { ...second, legacyKind: null },
      ),
    )
    .map((type) => {
      const stock = type.stocks[0];
      const damaged = (stock?.issues ?? []).reduce(
        (total, issue) => total + (issue.quantity ?? 0),
        0,
      );
      return toStockView(type, branchId, stock?.quantity ?? 0, damaged);
    });
};

// FIX-067: counted equipment per Branch («Balones: 12, 1 dañado»), run by the
// Administrator and the Coordinator like the numbered units (ADR-0106).
export const createPrismaEquipmentStocks = (
  prisma: PrismaClient,
  dependencies: { now: () => Date },
) => ({
  listStocks: async (
    query: { branchId: string },
    principal: AuthenticatedPrincipal,
  ) => {
    requireEquipmentManager(principal);
    return { items: await listBranchStocks(prisma, query.branchId) };
  },

  setStockQuantity: async (
    input: { branchId: string; typeId: string; quantity: number },
    principal: AuthenticatedPrincipal,
  ): Promise<EquipmentStockView> => {
    requireEquipmentManager(principal);
    return prisma
      .$transaction(async (transaction) => {
        await requireActiveBranch(transaction, input.branchId);
        return writeStockQuantity(
          transaction,
          input,
          principal,
          dependencies.now(),
        );
      })
      .catch(translateEquipmentError);
  },

  reportStockDamage: async (
    input: {
      branchId: string;
      typeId: string;
      quantity: number;
      description: string;
    },
    principal: AuthenticatedPrincipal,
  ) => {
    const actor = requireEquipmentManager(principal);
    return prisma
      .$transaction(async (transaction) => {
        await requireActiveBranch(transaction, input.branchId);
        return recordStockDamage(transaction, input, actor, dependencies.now());
      })
      .catch(translateEquipmentError);
  },

  // «Dar de baja»: the damage is resolved as written off and the stock loses
  // those units, together.
  writeOffIssue: async (
    input: { issueId: string },
    principal: AuthenticatedPrincipal,
  ) => {
    const actor = requireEquipmentManager(principal);
    return prisma
      .$transaction(async (transaction) => {
        const issue = await transaction.equipmentIssue.findUnique({
          where: { id: input.issueId },
          select: { stockId: true, quantity: true },
        });
        if (issue === null) {
          throw new BackOfficeError('equipment_issue_not_found');
        }
        if (issue.stockId === null || issue.quantity === null) {
          throw new BackOfficeError('equipment_issue_not_stock');
        }
        const [stock] = await transaction.$queryRaw<
          { id: string; branch_id: string; type_id: string; quantity: number }[]
        >`
          SELECT id, branch_id, type_id, quantity
          FROM back_office.equipment_stocks
          WHERE id = ${issue.stockId}::uuid FOR UPDATE`;
        const now = dependencies.now();
        const { count } = await transaction.equipmentIssue.updateMany({
          where: { id: input.issueId, resolvedAt: null },
          data: {
            resolvedAt: now,
            resolvedByAccountId: actor.accountId,
            writtenOff: true,
          },
        });
        if (count === 0) throw new BackOfficeError('equipment_issue_resolved');
        const quantity = stock.quantity - issue.quantity;
        await transaction.equipmentStock.update({
          where: { id: stock.id },
          data: { quantity, updatedAt: now },
        });
        await auditQuantityChange(transaction, principal, {
          stockId: stock.id,
          branchId: stock.branch_id,
          typeId: stock.type_id,
          previousQuantity: stock.quantity,
          quantity,
          cause: 'write_off',
          issueId: input.issueId,
          occurredAt: now,
        });
        return toIssueView(
          await transaction.equipmentIssue.findUniqueOrThrow({
            where: { id: input.issueId },
            select: issueSelect,
          }),
        );
      })
      .catch(translateEquipmentError);
  },
});

export type EquipmentStockOperations = ReturnType<
  typeof createPrismaEquipmentStocks
>;
